import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import React, { useRef, useImperativeHandle, forwardRef } from "react";

console.log('UsufructAgreementPDF rendered');

interface UsufructAgreementPDFProps {
  borrowDetails: {
    dateBorrowedFormatted: string;
  };
  student: {
    fullName: string;
    age: number;
    residenceAddress: string;
    isMinor?: boolean;
    guardianFullName?: string;
    guardianAge?: number;
    guardianAddress?: string;
    programName: string;
    collegeName: string;
  };
  tablet: {
    brand: string;
    color: string;
    model: string;
    serialNumber: string;
  };
}

const underline = (text: string, width = 120) => (
  <span style={{
    display: 'inline-block',
    borderBottom: '1px solid #000',
    minWidth: width,
    textAlign: 'center',
    fontWeight: 500,
    lineHeight: 1.0,
    verticalAlign: 'top',
    padding: '0 2px',
    paddingBottom: '7px',
    margin: '0 2px',
    background: 'transparent',
  }}>{text}</span>
);

const UsufructAgreementPDF = forwardRef(function UsufructAgreementPDF(
  { borrowDetails, student, tablet }: UsufructAgreementPDFProps,
  ref
) {
  const printRef = useRef<HTMLDivElement>(null);

  // Get current date and year
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.toLocaleString('default', { month: 'long' });
  const currentYear = now.getFullYear();

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    const element = printRef.current;
    // Legal size: 8.5 x 14 in = 612 x 1008 pt
    const pdf = new jsPDF({
      orientation: "p",
      unit: "pt",
      format: [612, 1008],
    });
    // Adjust scale for clarity and fit
    const canvas = await html2canvas(element, { scale: 1.1 });
    const imgData = canvas.toDataURL("image/png");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("usufruct_agreement.pdf");
  };

  useImperativeHandle(ref, () => ({
    exportPDF: handleExportPDF,
  }));

  return (
    <div>
      <button onClick={handleExportPDF} className="btn btn-primary mb-4">
        Export Usufruct Agreement as PDF
      </button>
      <div ref={printRef} style={{ width: "950px", margin: "0 auto", background: "#fff", color: "#000", padding: 12, fontFamily: 'serif', fontSize: 14, lineHeight: 1.5 }}>
        <div style={{ textAlign: "center", fontWeight: 700, fontSize: 22, letterSpacing: 1 }}>USUFRUCT AGREEMENT</div>
        <div style={{ textAlign: "center", fontSize: 16, marginBottom: 10 }}>(Mobile Device for Students)</div>
        <div style={{ fontWeight: 700, marginTop: 10 }}>KNOW ALL MEN BY THESE PRESENTS:</div>
        <div style={{ marginTop: 10, textAlign: 'justify' }}>
          This USUFRUCT AGREEMENT, hereinafter referred to as the <b>"Agreement"</b>, made and executed by and between:
        </div>
        <div style={{ marginTop: 10, textAlign: 'justify' }}>
          <b>University of Science and Technology of Southern Philippines (USTP)</b>, a State University created under and by virtue of RA No. 10919, otherwise known as the <i>"University of Science and Technology of Southern Philippines Act"</i>, with office address at CM Recto Ave., Lapasan, Cagayan de Oro City, hereinafter referred to as <b>"USTP"</b>,
        </div>
        <div style={{ textAlign: 'center', margin: '12px 0', fontWeight: 700 }}>-AND-</div>
        <div style={{ textAlign: 'justify' }}>
          {underline(student.fullName, 220)}, {underline(student.age.toString(), 40)} years old, resident of {underline(student.residenceAddress, 220)}
          {student.isMinor && student.guardianFullName && student.guardianAge && student.guardianAddress && (
            <>
              , herein represented by {underline(student.guardianFullName, 180)}, {underline(student.guardianAge?.toString() || '', 40)} years old, resident of {underline(student.guardianAddress, 180)}
            </>
          )}
          , hereinafter referred to as the <b>"USUFRUCTUARY"</b>, WITNESSETH:
        </div>
        <div style={{ marginTop: 10, textAlign: 'justify' }}>
          <b>WHEREAS</b>, USTP owns a mobile device, which is more particularly described as follows, to wit:
        </div>
        <div style={{ marginLeft: 32, marginTop: 8, marginBottom: 8 }}>
          Brand: {underline(tablet.brand, 120)}
          &nbsp; Color: {underline(tablet.color, 120)}
          &nbsp; Year Model: {underline(tablet.model, 80)}
          &nbsp; Serial No.: {underline(tablet.serialNumber, 120)}
        </div>
        <div style={{ marginTop: 8, textAlign: 'justify' }}>
          <b>WHEREAS</b>, the USUFRUCTUARY is a duly and currently enrolled student of USTP with the course {underline(student.programName, 180)} under the College of {underline(student.collegeName, 180)} who needs a mobile device through which he/ she could attend virtual instruction and comply other related requirements;
        </div>
        <div style={{ marginTop: 10, textAlign: 'justify' }}>
          <b>NOW THEREFORE</b>, for and in consideration of the desire of USTP to help augment the expenses of the USUFRUCTUARY in his/her education, the former, by this Agreement, do hereby allow the latter to POSSESS and USE the above-described mobile device, subject to the following covenants, that:
        </div>
        <ol style={{ marginLeft: 32, marginTop: 8 }}>
          <li>The USUFRUCTUARY shall:
            <ol type="a" style={{ marginLeft: 24 }}>
              <li>have exclusive right and privilege to use the aforementioned devise for his/ her education purposes only, and shall not lend the same property to others;</li>
              <li>be responsible for all the necessary expenses for the preservation of the said property, including the payment for the maintenance and repair for its continued use;</li>
              <li>bear the burden of preserving the property, ensuring its usefulness in the future and paying any expenses for the minor improvement of the property;</li>
              <li>be liable for the depreciated value of the mobile device for its loss or undue deterioration caused by fraud or negligence;</li>
              <li>not be responsible for the deterioration of the property because of normal use;</li>
            </ol>
          </li>
          <li>While the usufruct and/ or the beneficial use of the foregoing mobile device is transferred to the USUFRUCTUARY, the ownership and title thereof remains with and continues to be in the name of USTP;</li>
          <li>If the property becomes unserviceable before the expiration of the Term, the USUFRUCTUARY shall immediately inform USTP and return the same to the latter;</li>
          <li>Upon the expiration of the Term, the USUFRUCTUARY shall return the property to USTP and the condition of which shall be assessed by the latter before acceptance; and</li>
          <li>This Agreement shall take effect upon its execution and shall remain in full force and effect unless terminated anytime by mutual agreement of the parties, provided, that the USUFRUCTUARY shall be made to finish the semester before any termination of this agreement could take effect.</li>
          <li>The Agreement is subject to regular evaluation as to the academic performance of the Usufructuary. At the end of a semester, this Agreement may be terminated on ground that the Usufructuary obtained a grade of P/INC, unless meritorious reason/s shall be established which shall be determined by the concerned department chairperson, and approved by the Vice Chancellor for Academic Affairs of USTP- Claveria.</li>
        </ol>
        <div style={{ marginTop: 10, textAlign: 'justify' }}>
          IN WITNESS WHEREOF, the parties hereunder affix their signature this {underline(currentDay.toString(), 40)} day of {underline(currentMonth, 100)} {currentYear} at USTP, Cagayan de Oro City, Philippines.
        </div>
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ width: '45%', textAlign: 'center' }}>
            <b>USTP</b><br />
            Represented by:<br /><br />
            <b>DR. AMBROSIO B. CULTURA II</b><br />
            President, University System
          </div>
          <div style={{ width: '45%', textAlign: 'center' }}>
            <b>USUFRUCTUARY</b><br />
            Represented by, or<br />
            signing by himself/herself:<br /><br />
            <b>{student.fullName}</b><br />
            Student/ Mother/ Guardian
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          Signed in the presence: {underline('', 140)} and {underline('', 140)}
        </div>
        <div style={{ marginTop: 20, fontSize: 12 }}>
          <b>ACKNOWLEDGEMENT</b><br />
          Republic of the Philippines<br />
          City of Cagayan de Oro    ) S.S.<br />
          x-----------------------------------x<br />
          BEFORE ME, a Notary Public for the City of Cagayan de Oro, this {underline('', 60)} {currentYear} personally appeared the following:
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6, marginBottom: 6, fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ padding: 2, fontWeight: 700 }}>NAME</th>
                <th style={{ padding: 2, fontWeight: 700 }}>Identification Number</th>
                <th style={{ padding: 2, fontWeight: 700 }}>Date Issued</th>
                <th style={{ padding: 2, fontWeight: 700 }}>Place Issued</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: 2 }}>AMBROSIO B. CULTURA II</td>
                <td style={{ border: '1px solid #000', padding: 2 }}></td>
                <td style={{ border: '1px solid #000', padding: 2 }}></td>
                <td style={{ border: '1px solid #000', padding: 2 }}></td>
              </tr>
            </tbody>
          </table>
          All parties known to me to be the same persons who executed the foregoing Agreement, and acknowledge to me that the same is their free and voluntary act and deed.<br />
          WITNESS MY HAND AND SEAL.<br />
          Doc No.{underline('', 60)}<br />
          Page No.{underline('', 60)}<br />
          Book No.{underline('', 60)}<br />
          Series of {currentYear}
        </div>
      </div>
    </div>
  );
});

export default UsufructAgreementPDF; 