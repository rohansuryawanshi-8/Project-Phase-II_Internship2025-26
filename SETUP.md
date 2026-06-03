# Setup Instructions

## 1. Install Frontend Dependencies

```powershell
cd frontend
npm install
```

## 2. Install Backend Dependencies

Open a new terminal from the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

You can also install from the root dependency file:

```powershell
pip install -r requirements.txt
```

## 3. Run the Backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8001
```

## 4. Run the Frontend

Open another terminal from the project root:

```powershell
cd frontend
npm run dev
```

## 5. Build the Frontend

```powershell
cd frontend
npm run build
```

## Important Notes

- Keep the backend running on port `8001`.
- The frontend uses `/api/analyze`, which is proxied to the backend during development.
- Do not include `frontend/node_modules`, `frontend/dist`, or `backend/.venv` in the final submission unless your college specifically asks for them.
