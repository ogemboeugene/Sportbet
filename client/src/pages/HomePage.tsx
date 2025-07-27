import React from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Shield, Zap, Users } from 'lucide-react'

const HomePage: React.FC = () => {
  const features = [
    {
      icon: TrendingUp,
      title: 'Real-time Odds',
      description: 'Get the latest odds from multiple sports and leagues with live updates.',
    },
    {
      icon: Shield,
      title: 'Secure & Licensed',
      description: 'Your funds and data are protected with bank-level security and full licensing.',
    },
    {
      icon: Zap,
      title: 'Instant Payouts',
      description: 'Fast withdrawals and deposits with multiple payment methods supported.',
    },
    {
      icon: Users,
      title: 'Expert Support',
      description: '24/7 customer support from our team of betting and technical experts.',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Professional Sports Betting Platform
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100 max-w-3xl mx-auto">
              Experience the future of sports betting with real-time odds, secure payments, 
              and responsible gambling features.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="btn btn-lg bg-white text-primary-600 hover:bg-gray-100 px-8"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="btn btn-lg border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose BetPlatform?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              We provide everything you need for a safe, secure, and enjoyable betting experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="text-center p-6 rounded-lg bg-gray-50 dark:bg-gray-800 hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full mb-4">
                    <Icon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Start Betting?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust BetPlatform for their sports betting needs.
          </p>
          <Link
            to="/register"
            className="btn btn-primary btn-lg px-8"
          >
            Create Your Account
          </Link>
        </div>
      </section>
    </div>
  )
}

export default HomePage