FROM public.ecr.aws/lambda/python:3.12
COPY requirements.lock.txt ${LAMBDA_TASK_ROOT}/requirements.lock.txt
RUN pip install --no-cache-dir -r requirements.lock.txt && python -c "import cv2,numpy,platform; assert cv2.__version__.startswith('5.'); assert platform.machine()=='x86_64'; print(cv2.__version__,numpy.__version__)"
COPY backend ${LAMBDA_TASK_ROOT}/backend
COPY fixtures/generator ${LAMBDA_TASK_ROOT}/fixtures/generator
RUN python fixtures/generator/generate.py
COPY pytest.ini ${LAMBDA_TASK_ROOT}/pytest.ini
RUN mkdir -p docs/evidence && python -m pytest backend/tests -q
CMD ["backend.app.main.handler"]
