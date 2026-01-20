#!/usr/bin/env python3
"""
DWG to PDF Conversion Service
Uses ezdxf library for DXF files and subprocess for DWG files
"""

import os
import sys
import subprocess
import tempfile
import logging
from pathlib import Path
from typing import Optional, Tuple
import ezdxf
from ezdxf.addons.drawing import RenderContext, Frontend
from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfgen import canvas
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DWGConverter:
    """DWG/DXF to PDF converter using multiple strategies"""
    
    def __init__(self):
        self.temp_dir = tempfile.gettempdir()
        
    def convert_dxf_to_pdf(self, dxf_path: str, output_pdf: str) -> Tuple[bool, Optional[str]]:
        """
        Convert DXF file to PDF using ezdxf library
        Returns: (success: bool, error_message: Optional[str])
        """
        try:
            logger.info(f"Converting DXF file: {dxf_path}")
            
            # Load DXF document
            doc = ezdxf.readfile(dxf_path)
            msp = doc.modelspace()
            
            # Create matplotlib figure
            fig = plt.figure(figsize=(11, 8.5))  # Letter size
            ax = fig.add_axes([0, 0, 1, 1])
            ctx = RenderContext(doc)
            out = MatplotlibBackend(ax)
            Frontend(ctx, out).draw_layout(msp, finalize=True)
            
            # Save as PNG first (intermediate step)
            temp_png = os.path.join(self.temp_dir, f"temp_{os.getpid()}.png")
            fig.savefig(temp_png, dpi=300, bbox_inches='tight', pad_inches=0)
            plt.close(fig)
            
            # Convert PNG to PDF using reportlab
            img = Image.open(temp_png)
            img_width, img_height = img.size
            
            # Calculate PDF dimensions maintaining aspect ratio
            pdf_width = 612  # Letter width in points
            pdf_height = (img_height / img_width) * pdf_width
            
            c = canvas.Canvas(output_pdf, pagesize=(pdf_width, pdf_height))
            c.drawImage(temp_png, 0, 0, width=pdf_width, height=pdf_height)
            c.save()
            
            # Cleanup temp PNG
            if os.path.exists(temp_png):
                os.remove(temp_png)
            
            logger.info(f"Successfully converted DXF to PDF: {output_pdf}")
            return True, None
            
        except Exception as e:
            error_msg = f"DXF conversion failed: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    def convert_dwg_to_dxf(self, dwg_path: str, dxf_path: str) -> Tuple[bool, Optional[str]]:
        """
        Convert DWG to DXF using LibreCAD CLI (if available)
        Returns: (success: bool, error_message: Optional[str])
        """
        try:
            # Check if LibreCAD is available
            result = subprocess.run(
                ['which', 'librecad'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode != 0:
                return False, "LibreCAD not found in system PATH"
            
            # Note: LibreCAD doesn't have a direct CLI for conversion
            # This is a placeholder for when proper DWG converter is available
            # For now, we'll return an error suggesting manual conversion
            return False, "DWG direct conversion not available. Please convert to DXF format first."
            
        except subprocess.TimeoutExpired:
            return False, "Conversion process timed out"
        except Exception as e:
            return False, f"DWG conversion failed: {str(e)}"
    
    def convert_to_pdf(self, input_path: str, output_path: str) -> Tuple[bool, Optional[str]]:
        """
        Main conversion method - detects file type and converts accordingly
        Returns: (success: bool, error_message: Optional[str])
        """
        file_ext = Path(input_path).suffix.lower()
        
        if file_ext == '.dxf':
            return self.convert_dxf_to_pdf(input_path, output_path)
        elif file_ext == '.dwg':
            # Try to convert DWG to DXF first, then to PDF
            temp_dxf = os.path.join(self.temp_dir, f"temp_{os.getpid()}.dxf")
            success, error = self.convert_dwg_to_dxf(input_path, temp_dxf)
            
            if success:
                result = self.convert_dxf_to_pdf(temp_dxf, output_path)
                if os.path.exists(temp_dxf):
                    os.remove(temp_dxf)
                return result
            else:
                return False, error
        else:
            return False, f"Unsupported file format: {file_ext}"


def main():
    """CLI interface for testing"""
    if len(sys.argv) != 3:
        print("Usage: python converter.py <input_file> <output_pdf>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    if not os.path.exists(input_file):
        print(f"Error: Input file not found: {input_file}")
        sys.exit(1)
    
    converter = DWGConverter()
    success, error = converter.convert_to_pdf(input_file, output_file)
    
    if success:
        print(f"Successfully converted to: {output_file}")
        sys.exit(0)
    else:
        print(f"Conversion failed: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()
