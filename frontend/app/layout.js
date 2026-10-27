// Owner: P1 + P2 (shared)
import NavBar from "@/components/NavBar";
import "./globals.css";

export const metadata = {
  title: "News Perspective Explorer",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        {children}
        <footer>
          Perspective labels are rule-based indicators, not a measure of bias.
          · News Perspective Explorer, DBMS project
        </footer>
      </body>
    </html>
  );
}
