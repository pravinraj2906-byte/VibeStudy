# Fixture A: Missing Object-Level Authorization (IDOR)
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel

app = FastAPI()

# In-memory mock database
INVOICES = {
    101: {"id": 101, "owner_id": "user_alice", "amount": 4500.00, "client": "Confidential Corp"},
    102: {"id": 102, "owner_id": "user_bob", "amount": 120.00, "client": "Personal Services"},
}

@app.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: int, x_user_id: str = Header("user_bob")):
    """
    VULNERABLE ENDPOINT:
    Accepts invoice_id from path. Authenticates caller via x_user_id header,
    but FAILS to check that invoice['owner_id'] == x_user_id!
    """
    if invoice_id not in INVOICES:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Missing authorization check:
    # if invoice["owner_id"] != x_user_id: raise HTTPException(403, "Access denied")
    return INVOICES[invoice_id]
