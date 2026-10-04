const DOCS = {
  privacy: {
    title: 'Privacy Policy',
    body: [
      ['What we collect', 'Name, mobile number, email, city, course interest and any details you submit in enquiry, counselling or application forms. Institutions provide their profile and contact details.'],
      ['How we use it', 'To connect you with the institutions you choose, to provide counselling, to send OTPs and service notifications, and to improve the platform. We do not sell your personal data.'],
      ['Sharing', 'Your enquiry details are shared only with the institution(s) you enquire at or apply to, and with our counsellors. Phone numbers are verified by OTP.'],
      ['Your rights', 'You can view and update your profile from your dashboard, and request deletion of your account by writing to info@thespotadmission.co.in, in line with the Digital Personal Data Protection Act, 2023.'],
      ['Security', 'Passwords are hashed, OTPs are stored as one-way hashes and expire quickly, and all traffic should be served over HTTPS in production.'],
    ],
  },
  terms: {
    title: 'Terms of Use',
    body: [
      ['Use of the platform', 'The Spot Admission is an information and enquiry platform. Admission decisions are made solely by the institutions.'],
      ['Accuracy', 'Institutions are responsible for the accuracy of their listings. We verify listings but cannot guarantee every detail; please confirm fees and eligibility with the institution.'],
      ['Reviews', 'Reviews must be honest and based on genuine experience. We may reject or remove reviews that are abusive, fake or promotional.'],
      ['Institutions', 'Institutions must not misuse student data received through enquiries and must respond to genuine enquiries in a timely manner.'],
      ['Contact', 'Questions about these terms: info@thespotadmission.co.in'],
    ],
  },
};

export default function Legal({ kind }) {
  const doc = DOCS[kind];
  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="text-3xl font-bold">{doc.title}</h1>
      <div className="mt-6 space-y-6">
        {doc.body.map(([h, p]) => (
          <section key={h}>
            <h2 className="text-lg font-semibold">{h}</h2>
            <p className="mt-1 text-slate-700">{p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
