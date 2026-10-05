import React, { useState } from "react";
import { LoaderCircle, LogOut, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const formatDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

export default function AccountSettings() {
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const name = user?.displayName || user?.email?.split("@")[0] || "Account";
  const signOut = async () => { setSigningOut(true); try { await logout(); } finally { setSigningOut(false); } };
  const details = [
    ["Email", user?.email || "—"],
    ["Sign-in method", "Google"],
    ["Member since", formatDate(user?.metadata?.creationTime)],
    ["Last sign-in", formatDate(user?.metadata?.lastSignInTime)],
  ];
  return <>
    <section className="settings-card">
      <div className="account-profile">
        <span className="account-avatar">{user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : <UserRound size={28} />}</span>
        <div><h2>{name}</h2><p>{user?.email}</p></div>
        <span className="settings-badge ready">Signed in</span>
      </div>
      <dl className="account-details">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="settings-help">Your name and photo come from your Google account. Change them in your Google account settings.</p>
    </section>
    <section className="settings-card settings-row">
      <div><h2>Sign out</h2><p>End your session on this device. Your projects and reviews stay saved to your account.</p></div>
      <button className="settings-danger" onClick={signOut} disabled={signingOut}>
        {signingOut ? <LoaderCircle size={16} className="animate-spin" /> : <LogOut size={16} />}Sign out</button>
    </section>
  </>;
}
