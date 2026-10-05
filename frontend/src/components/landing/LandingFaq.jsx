import React from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  ["Does DevMind run my code?", "No. Submitted source is treated strictly as data and reviewed statically. Nothing is executed."],
  ["Which AI model does it use?", "Repository reviews and Project Q&A use Google Gemini with a key you add in Settings. The key is held in a temporary backend session store, not in your project records."],
  ["Can it prove a repository is safe?", "No tool can. DevMind surfaces source indicators with file and line evidence, records review coverage, and leaves the final decision to you."],
  ["Where is my data stored?", "Projects, reviews, and decisions are stored in Firestore collections that only your Google account can read and write."],
  ["Do I need an account?", "Yes. DevMind uses Google sign-in to create your workspace and keep it in sync across devices."],
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
