API endpoints summary:

GET /candidates/:id

PUT /candidates/:id (update status or fields)

GET /candidates/:id/documents

POST /candidates/:id/verify/send-otp — send OTP

POST /candidates/:id/verify/confirm-otp — confirm OTP

POST /candidates/:id/interviews — save interview round

GET /candidates/:id/interviews — list rounds

POST /candidates/:id/offer/generate — generate PDF / offer

(Optional) GET /candidates/:id/offer or GET /candidates/:id/offer/download — fetch generated file