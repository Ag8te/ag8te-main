from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import cm
from datetime import datetime

class DocumentService:
    @staticmethod
    def generate_invoice(order_data):
        """Generate PDF invoice for a shop order"""
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        # Header
        p.setFont("Helvetica-Bold", 20)
        p.drawString(2 * cm, height - 2 * cm, "MzansiServe - TAX INVOICE")
        
        p.setFont("Helvetica", 10)
        p.drawString(2 * cm, height - 3 * cm, f"Invoice #: {order_data['id']}")
        p.drawString(2 * cm, height - 3.5 * cm, f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        p.drawString(2 * cm, height - 4 * cm, f"Customer: {order_data.get('customer_email', 'Guest')}")

        # Table Header
        p.line(2 * cm, height - 5 * cm, width - 2 * cm, height - 5 * cm)
        p.drawString(2 * cm, height - 5.5 * cm, "Item Description")
        p.drawString(width - 5 * cm, height - 5.5 * cm, "Qty")
        p.drawString(width - 3 * cm, height - 5.5 * cm, "Price")
        p.line(2 * cm, height - 6 * cm, width - 2 * cm, height - 6 * cm)

        # Items
        y = height - 6.5 * cm
        total = 0
        for item in order_data.get('items', []):
            p.drawString(2 * cm, y, str(item.get('name', 'N/A')))
            p.drawString(width - 5 * cm, y, str(item.get('quantity', 1)))
            price = float(item.get('price', 0))
            p.drawString(width - 3 * cm, y, f"R{price:.2f}")
            total += price * int(item.get('quantity', 1))
            y -= 0.5 * cm

        # Footer
        p.line(2 * cm, y, width - 2 * cm, y)
        p.setFont("Helvetica-Bold", 12)
        p.drawString(width - 7 * cm, y - 1 * cm, "TOTAL AMOUNT:")
        p.drawString(width - 3 * cm, y - 1 * cm, f"R{total:.2f}")

        p.showPage()
        p.save()
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_certificate(request_data):
        """Generate PDF completion certificate for a professional service"""
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        # Border
        p.setStrokeColor(colors.gold)
        p.setLineWidth(5)
        p.rect(1 * cm, 1 * cm, width - 2 * cm, height - 2 * cm)

        # Content
        p.setFont("Helvetica-Bold", 24)
        p.drawCentredString(width / 2, height - 5 * cm, "CERTIFICATE OF SERVICE")
        
        p.setFont("Helvetica", 14)
        p.drawCentredString(width / 2, height - 8 * cm, "This is to certify that")
        
        p.setFont("Helvetica-Bold", 18)
        p.drawCentredString(width / 2, height - 10 * cm, f"{request_data.get('client_name', 'Client')}")
        
        p.setFont("Helvetica", 14)
        p.drawCentredString(width / 2, height - 12 * cm, "successfully completed a service request with")
        
        p.setFont("Helvetica-Bold", 18)
        p.drawCentredString(width / 2, height - 14 * cm, f"{request_data.get('provider_name', 'MzansiServe Professional')}")
        
        p.setFont("Helvetica", 12)
        p.drawCentredString(width / 2, height - 17 * cm, f"Service Request ID: {request_data['id']}")
        p.drawCentredString(width / 2, height - 18 * cm, f"Completion Date: {datetime.now().strftime('%Y-%m-%d')}")

        p.showPage()
        p.save()
        buffer.seek(0)
        return buffer
