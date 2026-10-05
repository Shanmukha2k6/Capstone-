import React from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  ["Does DevMind run my code?", "No. Submitted source is treated strictly as data and reviewed statically. Nothing is executed."],
  ["Which AI model does it use?", "Repository reviews and Project Q&A use Google Gemini with a key you add in Settings. The key is held in a temporary backend session store, not in your project records."],
  ["Can it prove a repository is safe?", "No tool can. DevMind surfaces source indicators with file and line evidence, records review coverage, and leaves the final decision to you."],
  ["Where is my data stored?", "Guests keep data in this browser. Signed-in users store projects, reviews, and decisions in owner-only Firestore collections."],
  ["Do I need an account?", "No. You can use DevMind as a guest on this device, then sign in with Google to sync across devices."],
];

export default function Faq() {
  return (
    <section className="lp-section" id="faq">
      <div className="lp-container lp-faq">
        <div className="lp-section-head"><span className="lp-eyebrow">FAQ</span><h2>Questions, answered.</h2></div>
        {FAQS.map(([question, answer]) => (
          <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>
        ))}
      </div>
    </section>
  );
}
