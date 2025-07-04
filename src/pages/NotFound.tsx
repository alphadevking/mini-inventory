import { Button } from "../components/ui/button";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900 px-4">
      <h1 className="text-6xl font-bold text-destructive mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-2 text-center">Page Not Found</h2>
      <p className="mb-8 text-gray-600 dark:text-gray-300 text-center max-w-xl">
        Sorry, the page you are looking for does not exist or has been moved.
      </p>
      <Button asChild variant="default" size="lg">
        <Link to="/">Go back Home</Link>
      </Button>
    </div>
  );
}