from fastapi import FastAPI, HTTPException, Header

app = FastAPI()
INVOICES = {
    101: {"id": 101, "owner": "alice", "amount": 500},
    102: {"id": 102, "owner": "bob", "amount": 300}
}

@app.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: int, x_user: str = Header("bob")):
    # SAFE: Verifies resource ownership against authenticated header
    if invoice_id not in INVOICES:
        raise HTTPException(status_code=404)
    inv = INVOICES[invoice_id]
    if inv["owner"] != x_user:
        raise HTTPException(status_code=403, detail="Forbidden: Resource owner mismatch")
    return inv
