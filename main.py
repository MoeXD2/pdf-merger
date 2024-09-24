# main.py
import os
import tempfile
from fastapi import FastAPI, File, UploadFile, Request, Form
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from PyPDF2 import PdfReader, PdfWriter
import uuid
import base64

app = FastAPI()

# Create a temporary directory to store uploaded files
TEMP_DIR = tempfile.mkdtemp()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up Jinja2 templates
templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    file_path = os.path.join(TEMP_DIR, f"{file_id}.pdf")

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    return JSONResponse(
        {
            "id": file_id,
            "name": file.filename,
        }
    )


@app.post("/merge")
async def merge_pdfs(file_order: str = Form(...)):
    file_ids = file_order.split(",")
    merger = PdfWriter()

    try:
        for file_id in file_ids:
            file_path = os.path.join(TEMP_DIR, f"{file_id}.pdf")
            reader = PdfReader(file_path)
            for page in reader.pages:
                merger.add_page(page)

        merged_filename = f"{uuid.uuid4()}.pdf"
        output_path = os.path.join(TEMP_DIR, merged_filename)

        with open(output_path, "wb") as output_file:
            merger.write(output_file)

        return FileResponse(
            output_path, media_type="application/pdf", filename=merged_filename
        )
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.on_event("shutdown")
def cleanup():
    import shutil

    shutil.rmtree(TEMP_DIR)
