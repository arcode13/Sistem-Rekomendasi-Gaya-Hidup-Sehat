FROM python:3.12-slim-bookworm

WORKDIR /app

RUN pip install --no-cache-dir \
    trulens>=2.0.0 \
    trulens-providers-openai>=1.0.0 \
    trulens-providers-google>=1.0.0 \
    fastapi>=0.104.0 \
    uvicorn>=0.24.0 \
    httpx>=0.27.0 \
    pandas>=2.0.0

COPY app.py /app/

EXPOSE 5056

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5056"]