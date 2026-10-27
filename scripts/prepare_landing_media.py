"""Optimize preserved ElevenLabs originals. This script does not generate AI images."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont

root=Path('docs/design/landing')
out=Path('frontend/public/media/landing')
out.mkdir(parents=True,exist_ok=True)
prompts={
 'pantry': 'ShelfSignal editorial photograph: a close, beautifully composed view along a neighborhood grocery shelf with rows of green glass olive oil bottles, cream paper pantry cartons and amber jars. Products are generic with subtle fictional labels, no recognizable brands. Matte charcoal metal shelving, rich forest-green and warm ivory palette, crisp tactile packaging, soft directional store lighting with realistic shadows. Camera at shelf height, shallow perspective receding to the right, foreground bottles sharp. Quiet, precise, premium documentary retail photography, natural color, no neon, no science-fiction graphics. Vertical 2:3 composition. No people, no logos, no UI, no overlay text, no watermark. This is illustrative synthetic imagery for a reference-based shelf inspection product.',
 'capture': 'ShelfSignal editorial photograph, vertical 2:3. Close over-the-shoulder crop of a grocery associate taking a shelf photograph with a plain black smartphone held horizontally in both hands. Only natural hands and a dark forest-green work shirt sleeve visible, no face. Phone screen shows a simple camera view of the same pantry shelf directly in front of it, no detection graphics, no app logos, no readable UI text. Shelves carry cream and ochre cereal cartons and green pantry bottles, with one empty product-sized gap visible. Premium documentary photography, tactile packaging, charcoal fixtures, soft warm-white shop lighting, restrained green and ivory palette, realistic perspective and anatomy, sharp phone and hands, gently soft background. Honest everyday retail work, quiet and considered, no science-fiction, no neon, no captions, no watermark. Synthetic illustrative media, not a customer testimonial.'
}
records={}
for name in prompts:
    source=root/(name+'-original.png')
    image=Image.open(source).convert('RGB')
    image.thumbnail((1024,1536))
    image.save(out/(name+'.webp'),quality=85,method=6)
    records[name]={'original':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'prompt':prompts[name],'web_asset':str(out/(name+'.webp'))}
pantry=Image.open(root/'pantry-original.png').convert('RGB')
pantry.crop((260,720,890,1536)).resize((630,816)).save(out/'pantry-detail.webp',quality=85,method=6)
# A composed social card is typeset locally from the actual generated illustration.
card=Image.new('RGB',(1200,630),'#101713')
card.paste(ImageOps.fit(pantry,(440,630)),(760,0))
draw=ImageDraw.Draw(card)
font=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',70)
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',24)
draw.text((65,65),'ShelfSignal',font=small,fill='#bfdac7')
draw.text((65,205),'SEE THE GAP.',font=font,fill='#edf4ed')
draw.text((65,290),'CLOSE THE LOOP.',font=font,fill='#b8d6c2')
draw.text((65,480),'Evidence before action.',font=small,fill='#9db5a5')
draw.text((65,552),'AI-generated illustrative photography',font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',15),fill='#7c9987')
card.save(out/'social-preview.jpg',quality=90)
(root/'provenance.json').write_text(json.dumps({'provider':'ElevenLabs Image & Video','model_display_name':'GPT Image 2.5 Sunburst','settings':{'aspect_ratio':'2:3','resolution':'1K','quality':'High','number_of_generations':1,'prompt_enhancement':False},'synthetic':True,'purpose':'Illustrative landing media, not customer research or performance evidence.','records':records,'derivatives':{'pantry-detail.webp':'Crop from pantry original','social-preview.jpg':'Locally typeset card with generated pantry photograph','workspace-preview.webp':'Captured separately from the actual ShelfSignal application using synthetic fixture images'}},indent=2))
print('Optimized landing assets; preserved originals and exact prompts.')
