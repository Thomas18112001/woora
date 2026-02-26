import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Woora",
  description: "Gestion de projets et suivi du temps"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{const d=document.documentElement;const t=localStorage.getItem('woora-theme');if(t==='dark'){d.classList.add('dark')}const rm=localStorage.getItem('woora-reduced-motion');if(rm==='1'){d.classList.add('reduced-motion')}}catch(e){}"
          }}
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
