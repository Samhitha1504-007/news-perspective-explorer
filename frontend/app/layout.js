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
      </body>
    </html>
  );
}
