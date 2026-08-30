import json
import os
import uuid
from decimal import Decimal
import boto3
 
TABLE_NAME = os.environ.get("TABLE_NAME", "BankTransactions")
table = boto3.resource("dynamodb").Table(TABLE_NAME)
 
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)
 
def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
        },
        "body": json.dumps(body, cls=DecimalEncoder)
    }
 
def lambda_handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
 
    if method == "OPTIONS":
        return response(200, {"message": "CORS preflight"})
 
    if method == "GET":
        items = table.scan().get("Items", [])
        return response(200, {"transactions": items})
 
    if method == "POST":
        try:
            payload = json.loads(event.get("body") or "{}")
            tx_type = payload.get("type")
            amount = Decimal(str(payload.get("amount")))
            if tx_type not in ["Deposit", "Withdrawal"] or amount <= 0:
                return response(400, {"message": "Enter a valid type and positive amount"})
            item = {
                "transactionId": str(uuid.uuid4()),
                "type": tx_type,
                "amount": amount,
                "description": payload.get("description", "Portal demo")
            }
            table.put_item(Item=item)
            return response(201, item)
        except Exception:
            return response(400, {"message": "Invalid request"})
 
    return response(405, {"message": "Method not allowed"})

