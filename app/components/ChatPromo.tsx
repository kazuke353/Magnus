import { Link } from "@remix-run/react";
import Card from "./Card";
import { FiMessageSquare } from "react-icons/fi";

interface ChatPromoProps {
  className?: string;
}

export default function ChatPromo({ className = "" }: ChatPromoProps) {
  return (
    <Card className={`bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg rounded-xl p-6 ${className}`}>
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="mb-4 md:mb-0">
          <h3 className="text-xl font-bold mb-2">Need help with your finances?</h3>
          <p className="text-gray-100 text-lg">Chat with our AI assistant to get personalized advice and insights.</p>
        </div>
        <Link
          to="/chat"
          className="px-5 py-3 bg-white text-blue-600 rounded-md font-semibold hover:bg-blue-50 transition-colors shadow-md"
        >
          <FiMessageSquare className="inline-block mr-2" />
          Start chatting
        </Link>
      </div>
    </Card>
  );
}
