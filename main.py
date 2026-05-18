from fastapi import FastAPI

app = FastAPI(title="Anki Clone API")

@app.get("/")
def read_root():
    return {"message": "Привіт! FastAPI успішно працює."}
