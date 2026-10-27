"""Reference-based evidence. No fixture labels or inventory knowledge enter this module."""
import io, time
import cv2
import numpy as np
from PIL import Image, ImageOps

ALGORITHM = 'reference-occupancy-1.0'
MAX_BYTES = 8 * 1024 * 1024

def decode(raw: bytes):
    if not raw or len(raw) > MAX_BYTES:
        raise ValueError('Image must be between 1 byte and 8 MB')
    try:
        with Image.open(io.BytesIO(raw)) as im:
            if im.format not in ('JPEG', 'PNG', 'WEBP') or not (160 <= im.width <= 6000 and 120 <= im.height <= 6000) or im.width * im.height > 16_000_000:
                raise ValueError('Use PNG, JPEG or WebP, 160x120 minimum, at most 16 megapixels')
            im = ImageOps.exif_transpose(im).convert('RGB')
            im.thumbnail((1200, 900))
            return cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR)
    except Exception as exc:
        raise ValueError('Invalid or unsupported image: ' + str(exc)) from exc

def png(im):
    return cv2.imencode('.png', im)[1].tobytes()

def analyze(reference: bytes, inspection: bytes, regions: list[dict]):
    start = time.perf_counter()
    ref, current = decode(reference), decode(inspection)
    gray_ref, gray = [cv2.cvtColor(im, cv2.COLOR_BGR2GRAY) for im in (ref, current)]
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    diagnostics = {'sharpness': round(sharpness, 2), 'matches': 0, 'inlier_ratio': 0., 'reprojection_error': None}
    result = {'thresholds': {'min_sharpness':45,'min_matches':18,'min_inlier_ratio':.45,'max_reprojection_px':2.5,'gap_score':.48,'min_changed_fraction':.18}, 'algorithm': ALGORITHM, 'opencv': cv2.__version__, 'quality_ok': False, 'diagnostics': diagnostics, 'candidates': [], 'regions': [], 'reason': ''}
    overlay = current.copy()
    def finish(reason, ok=False):
        result.update(reason=reason, quality_ok=ok, duration_ms=round((time.perf_counter()-start)*1000, 2))
        return result, png(overlay)
    if sharpness < 45:
        return finish('Image is too blurred. Hold the camera steady and rescan.')
    orb = cv2.ORB_create(nfeatures=3500)
    kr, dr = orb.detectAndCompute(gray_ref, None)
    kc, dc = orb.detectAndCompute(gray, None)
    if dr is None or dc is None:
        return finish('Insufficient visual features for alignment.')
    pairs = cv2.BFMatcher(cv2.NORM_HAMMING).knnMatch(dc, dr, k=2)
    good = [m for pair in pairs if len(pair)==2 for m,n in [pair] if m.distance < .72*n.distance]
    diagnostics['matches'] = len(good)
    if len(good) < 18:
        return finish('Too few reliable feature matches; use the same shelf and viewpoint.')
    src = np.float32([kc[m.queryIdx].pt for m in good])
    dst = np.float32([kr[m.trainIdx].pt for m in good])
    H, mask = cv2.findHomography(src, dst, cv2.RANSAC, 3)
    if H is None:
        return finish('Alignment could not be estimated.')
    inliers = mask.ravel().astype(bool)
    ratio = float(inliers.mean())
    projected = cv2.perspectiveTransform(src[:,None,:], H)[:,0,:]
    error = float(np.median(np.linalg.norm(projected[inliers]-dst[inliers],axis=1)))
    diagnostics.update(inlier_ratio=round(ratio,3), reprojection_error=round(error,3))
    h,w = gray_ref.shape
    corners = cv2.perspectiveTransform(np.float32([[[0,0],[current.shape[1],0],[current.shape[1],current.shape[0]],[0,current.shape[0]]]]),H)[0]
    area = abs(cv2.contourArea(corners))/(w*h)
    if ratio < .45 or error > 2.5 or not .65 < area < 1.5:
        return finish('Alignment is unreliable; reposition the camera and rescan.')
    aligned = cv2.warpPerspective(current,H,(w,h))
    coverage = cv2.warpPerspective(np.ones(gray.shape,np.uint8),H,(w,h))
    overlay = aligned.copy()
    a = cv2.cvtColor(aligned,cv2.COLOR_BGR2GRAY)
    # Normalize broad exposure shifts using robust global luminance ratio.
    factor = np.clip(np.median(gray_ref)/max(1,np.median(a)),.5,2)
    a = np.clip(a.astype(float)*factor,0,255).astype(np.uint8)
    uncertain = False
    for region in regions:
        x,y,rw,rh = region['box']
        x1,y1,x2,y2 = int(x*w),int(y*h),int((x+rw)*w),int((y+rh)*h)
        r,c = gray_ref[y1:y2,x1:x2],a[y1:y2,x1:x2]
        if coverage[y1:y2,x1:x2].mean() < .97:
            return finish('An expected position is outside the aligned photograph.')
        er,ec = cv2.Canny(r,60,150),cv2.Canny(c,60,150)
        edge_ratio = float(np.mean(ec>0)/max(.01,np.mean(er>0)))
        texture_ratio = float(c.std()/max(5,r.std()))
        difference = cv2.absdiff(r,c)
        changed = cv2.morphologyEx((difference>35).astype(np.uint8),cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
        contours,_ = cv2.findContours(changed,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        changed_fraction = float(changed.mean())
        score = float(np.clip(.6*(1-edge_ratio)+.4*(1-texture_ratio),0,1))
        # A gap must lose both internal edges and texture; arbitrary appearance changes are uncertain.
        gap = score > .48 and changed_fraction > .18
        ambiguous = not gap and changed_fraction > .48
        uncertain |= ambiguous
        feature = {'id':region['id'],'box':region['box'],'score':round(score,3),'edge_ratio':round(edge_ratio,3),'texture_ratio':round(texture_ratio,3),'changed_fraction':round(changed_fraction,3),'components':len(contours),'gap':gap,'ambiguous':ambiguous}
        result['regions'].append(feature)
        if gap:
            result['candidates'].append(feature)
        color = (72,75,198) if gap else ((34,138,216) if ambiguous else (107,133,35))
        cv2.rectangle(overlay,(x1,y1),(x2,y2),color,2)
        cv2.putText(overlay,region['id'],(x1+4,y1+18),cv2.FONT_HERSHEY_SIMPLEX,.45,color,1)
    if uncertain:
        return finish('Large unexplained appearance change; possible occlusion. Clear the shelf view and rescan.')
    return finish('Possible gaps found; human review required.' if result['candidates'] else 'No significant occupancy loss detected.',True)
