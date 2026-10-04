const FAQS = [
  ['Is The Spot Admission free for students?', 'Yes. Searching, comparing, enquiring and applying through the platform is free for students and parents.'],
  ['Why do I need to verify my mobile with OTP?', 'OTP verification ensures institutions receive genuine enquiries and protects your number from misuse. We only share your details with the institutions you enquire at.'],
  ['What is spot admission?', 'After regular counselling rounds, institutions often have vacant seats. They post them here with a deadline so students can grab them before the round closes.'],
  ['How do I track my application?', 'Log in and open “My applications” in your dashboard. You will see each status change as the institution reviews it.'],
  ['How can my institution get listed?', 'Click “List your institution”, create an account and complete your profile. Our team verifies and approves listings, usually within 48 hours.'],
  ['Are reviews moderated?', 'Yes. Every review is checked by our team before it is published, and only one review per user per institution is allowed.'],
  ['Do you offer counselling?', 'Yes — pre-primary, school, college admission, career guidance, personalised and study-abroad counselling. Book a session from the Counselling page.'],
];

export default function Faq() {
  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Frequently asked questions</h1>
      <div className="mt-6 space-y-3">
        {FAQS.map(([q, a]) => (
          <details key={q} className="card p-4">
            <summary className="cursor-pointer font-semibold">{q}</summary>
            <p className="mt-2 text-slate-700">{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
