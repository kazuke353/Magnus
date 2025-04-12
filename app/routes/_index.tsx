import { LoaderFunctionArgs, json, redirect } from "@remix-run/node";
    import { Link } from "@remix-run/react";
    import { getUser } from "~/services/session.server";
    import Button from "~/components/Button";
    import { FiBarChart2, FiTarget, FiCheckSquare, FiMessageSquare, FiLogIn, FiUserPlus, FiTrendingUp, FiShield, FiZap } from "react-icons/fi";
    import Layout from "~/components/Layout";

    export async function loader({ request }: LoaderFunctionArgs) {
      const user = await getUser(request);
      if (user) {
        return redirect("/dashboard");
      }
      return json({});
    }

    export default function LandingPage() {
      return (
        <Layout>
          <div className="relative overflow-hidden bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 z-20 py-4 px-4 sm:px-6 lg:px-8">
              <nav className="flex justify-between items-center max-w-7xl mx-auto">
                <Link to="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  Magnus
                </Link>
                <div className="space-x-2">
                  {/* Fixed: Added */}
                  <Button variant="outline" size="sm" to="/login">
                    <FiLogIn className="mr-1 h-4 w-4" /> Login
                  </Button>
                  {/* Fixed: Added */}
                  <Button size="sm" to="/register">
                    <FiUserPlus className="mr-1 h-4 w-4" /> Sign Up
                  </Button>
                </div>
              </nav>
            </header>

            {/* Hero Section */}
            <section className="relative pt-36 pb-24 lg:pt-48 lg:pb-32">
              {/* Background Gradient */}
              <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-blue-100 dark:from-blue-900/30 to-transparent opacity-50 dark:opacity-100 z-0"></div>
              {/* Animated Blobs */}
              <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-300 dark:bg-purple-800 rounded-full mix-blend-multiply filter blur-xl opacity-40 dark:opacity-20 animate-blob animation-delay-2000 z-10"></div>
              <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-yellow-300 dark:bg-yellow-700 rounded-full mix-blend-multiply filter blur-xl opacity-40 dark:opacity-20 animate-blob animation-delay-4000 z-10"></div>
              <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-300 dark:bg-blue-800 rounded-full mix-blend-multiply filter blur-xl opacity-40 dark:opacity-20 animate-blob z-10"></div>

              <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl md:text-6xl">
                  Master Your Finances with <span className="text-blue-600 dark:text-blue-400">Magnus</span>
                </h1>
                <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 dark:text-gray-400">
                  The intelligent platform designed to simplify your portfolio management, track financial goals, organize tasks, and provide AI-driven insights.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  {/* Fixed: Added */}
                  <Button size="lg" to="/register" className="w-full sm:w-auto">
                    Get Started for Free
                  </Button>
                  {/* Fixed: Added */}
                  <Button size="lg" variant="secondary" to="/login" className="w-full sm:w-auto">
                    Login to Your Account
                  </Button>
                </div>
              </div>
            </section>

            {/* Benefits Section */}
            <section className="py-16 sm:py-24 bg-white dark:bg-gray-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                  <h2 className="text-base font-semibold text-blue-600 dark:text-blue-400 tracking-wide uppercase">Why Magnus?</h2>
                  <p className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight sm:text-4xl">
                    Unlock Your Financial Potential
                  </p>
                  <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400">
                    Gain clarity and control over your financial life with our integrated suite of tools.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                      <FiTrendingUp className="h-6 w-6" />
                    </div>
                    <h3 className="mt-6 text-lg font-medium text-gray-900 dark:text-gray-100">Comprehensive Tracking</h3>
                    <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                      Monitor investments, goals, and tasks all in one place for a holistic financial overview.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                      <FiZap className="h-6 w-6" />
                    </div>
                    <h3 className="mt-6 text-lg font-medium text-gray-900 dark:text-gray-100">AI-Powered Insights</h3>
                    <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                      Leverage intelligent analysis and chat assistance to make smarter financial decisions.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                      <FiShield className="h-6 w-6" />
                    </div>
                    <h3 className="mt-6 text-lg font-medium text-gray-900 dark:text-gray-100">Secure & Organized</h3>
                    <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                      Keep your financial data safe and your tasks organized for peace of mind.
                    </p>
                  </div>
                </div>
              </div>
            </section>


            {/* Features Section */}
            <section className="py-16 sm:py-24 bg-gray-100 dark:bg-gray-800/50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Core Features</h2>
                  <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Everything you need to manage and grow your wealth.</p>
                </div>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Feature Cards */}
                  {[
                    { icon: FiBarChart2, title: "Portfolio Tracking", description: "Monitor investments, analyze performance, and view detailed breakdowns.", color: "blue" },
                    { icon: FiTarget, title: "Goal Setting", description: "Define financial goals, track progress, and get projections to stay motivated.", color: "green" },
                    { icon: FiCheckSquare, title: "Task Management", description: "Organize financial to-dos, set reminders, and manage recurring tasks.", color: "yellow" },
                    { icon: FiMessageSquare, title: "AI Assistant", description: "Get personalized insights, ask questions, and receive guidance.", color: "purple" }
                  ].map((feature) => (
                    <div key={feature.title} className="text-center p-6 bg-white dark:bg-gray-700 rounded-lg shadow-lg transition-transform transform hover:scale-105">
                      <div className={`flex items-center justify-center h-12 w-12 rounded-md bg-${feature.color}-100 dark:bg-${feature.color}-900/50 text-${feature.color}-600 dark:text-${feature.color}-400 mx-auto mb-5`}>
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{feature.title}</h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Call to Action Section */}
            <section className="bg-blue-600 dark:bg-blue-800">
              <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:py-20 lg:px-8 text-center">
                <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                  Ready to Simplify Your Financial Life?
                </h2>
                <p className="mt-4 text-lg leading-6 text-blue-100 dark:text-blue-200">
                  Join Magnus today and start making smarter financial decisions. It's free to get started.
                </p>
                <div className="mt-8">
                  {/* Fixed: Added */}
                  <Button size="lg" variant="secondary" to="/register" className="bg-white text-blue-700 hover:bg-blue-50">
                    Sign Up Now
                  </Button>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-100 dark:bg-gray-900">
              <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} Magnus. All rights reserved.
              </div>
            </footer>

            {/* Add CSS for blob animation - REMOVED jsx attribute */}
            <style>{`
              @keyframes blob {
                0% { transform: translate(0px, 0px) scale(1); }
                33% { transform: translate(30px, -50px) scale(1.1); }
                66% { transform: translate(-20px, 20px) scale(0.9); }
                100% { transform: translate(0px, 0px) scale(1); }
              }
              .animate-blob {
                animation: blob 7s infinite;
              }
              .animation-delay-2000 { animation-delay: 2s; }
              .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
          </div>
        </Layout>
      );
    }
