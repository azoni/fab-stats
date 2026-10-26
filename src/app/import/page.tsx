import ImportPageContent from "./ImportPageContent";

// Route entries only receive Next.js page props. The shared import UI accepts
// shareMode separately so /share can reuse it without invalidating this route.
export default function ImportPage() {
  return <ImportPageContent />;
}
