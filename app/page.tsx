import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/options';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Holiday Planner
            </span>
          </div>
          <div className="flex space-x-4">
            <Link
              href="/auth/signin"
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Plan Your Perfect Vacation
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Together
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Collaborate with your partner to organize activities, accommodations, and
            itineraries with real-time AI assistance. Make vacation planning effortless.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/auth/signup"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-lg font-semibold"
            >
              Start Planning Free
            </Link>
            <Link
              href="#features"
              className="px-8 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-lg font-semibold"
            >
              Learn More
            </Link>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-white dark:bg-gray-800 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              Everything You Need to Plan the Perfect Trip
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                title="Interactive Calendar"
                description="Drag-and-drop scheduling with month, week, and day views. Color-coded activities make planning visual and intuitive."
                icon="📅"
              />
              <FeatureCard
                title="Real-Time Collaboration"
                description="Plan together in real-time. See changes instantly as you and your partner add activities and make decisions."
                icon="👥"
              />
              <FeatureCard
                title="AI Travel Assistant"
                description="Get instant answers about your itinerary, activity recommendations, and smart suggestions powered by AI."
                icon="🤖"
              />
              <FeatureCard
                title="Budget Tracking"
                description="Track costs by category and day. Stay on budget with automatic calculations and visual breakdowns."
                icon="💰"
              />
              <FeatureCard
                title="Activity Database"
                description="Browse thousands of activities, restaurants, and attractions. Filter by ratings, price, and category."
                icon="🎯"
              />
              <FeatureCard
                title="Export & Share"
                description="Export your itinerary as PDF or email. Share with friends and family or save as a template."
                icon="📤"
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Start Planning?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              Join thousands of couples planning their dream vacations
            </p>
            <Link
              href="/auth/signup"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-lg font-semibold inline-block"
            >
              Create Your Free Account
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2024 Holiday Planner. Built with Next.js and AI.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}
