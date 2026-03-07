# PoolVest Backend

## Django REST API for group investment tracking

### Quick Start
```bash
cd backend
python -m venv venv
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

### API Endpoints
- POST /api/auth/login/ - Login
- POST /api/auth/register/ - Register member
- GET /api/portfolio/dashboard/ - Dashboard data
- GET /api/investments/stocks/ - Stock list
- GET /api/contributions/ - Contributions
- GET /api/dividends/ - Dividends
- GET /api/reports/monthly/ - PDF report

### Test Credentials
- Admin: 9999999999 / admin123
- Member: 9876543210 / member123
