'use client'

import Link from 'next/link'

/* eslint-disable react/no-unescaped-entities */
export default function CommunityGuidelines() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Guidelines</h1>
          <p className="text-sm text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-green max-w-none">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-green-900 mb-2">Our Drama-Light Philosophy</h2>
              <p className="text-green-800">
                PlantsPack is dedicated to creating a supportive, positive community where vegans and plant-based
                enthusiasts can share their journey without unnecessary conflict or negativity. We believe in
                constructive conversation, mutual respect, and focusing on what brings us together: compassion
                for animals and love for plant-based living.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Be Kind and Respectful</h2>
            <p className="text-gray-700 mb-4">
              Treat all community members with kindness and respect. We all started somewhere, and everyone is on
              their own journey.
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Welcome newcomers and those curious about plant-based living</li>
              <li>Offer constructive advice rather than criticism</li>
              <li>Respect different approaches to veganism and plant-based diets</li>
              <li>Avoid personal attacks, name-calling, or hostile language</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Keep It Drama-Light</h2>
            <p className="text-gray-700 mb-4">
              We encourage healthy discussion, but avoid creating unnecessary conflict or drama:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Focus on positive sharing and constructive dialogue</li>
              <li>Disagree respectfully without being disagreeable</li>
              <li>Avoid &quot;calling out&quot; or public shaming of individuals</li>
              <li>Don&apos;t engage in or escalate arguments</li>
              <li>Report concerning behavior instead of responding with hostility</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. Stay On-Topic</h2>
            <p className="text-gray-700 mb-4">
              PlantsPack is a space for plant-based and vegan-related content:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Share recipes, meal ideas, and food discoveries</li>
              <li>Discuss vegan products, restaurants, and places</li>
              <li>Share your plant-based journey and experiences</li>
              <li>Offer tips, resources, and support</li>
              <li>Keep political discussions related to animal rights and veganism</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. No Harassment or Bullying</h2>
            <p className="text-gray-700 mb-4">
              PlantsPack has zero tolerance for harassment, bullying, or intimidation:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Do not repeatedly target or harass any user</li>
              <li>No doxing (sharing private information without consent)</li>
              <li>Do not organize or participate in brigading or mass reporting</li>
              <li>Respect users' decisions to block or mute you</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. No Hate Speech or Discrimination</h2>
            <p className="text-gray-700 mb-4">
              We do not tolerate content that promotes hatred or discrimination based on:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Race, ethnicity, or national origin</li>
              <li>Religion or beliefs</li>
              <li>Gender identity or sexual orientation</li>
              <li>Disability or health conditions</li>
              <li>Age</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Respect Content Guidelines</h2>
            <p className="text-gray-700 mb-4">
              When posting content, please ensure it is:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li><strong>Appropriate:</strong> No graphic violence, explicit content, or disturbing imagery</li>
              <li><strong>Original or Credited:</strong> Respect intellectual property rights and credit sources</li>
              <li><strong>Accurate:</strong> Avoid spreading misinformation or false health claims</li>
              <li><strong>Safe:</strong> Don't share content that promotes self-harm or dangerous activities</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. No Spam or Commercial Abuse</h2>
            <p className="text-gray-700 mb-4">
              We want PlantsPack to be authentic and valuable:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Don't post repetitive or irrelevant content</li>
              <li>No excessive self-promotion or advertising without disclosure</li>
              <li>Don't manipulate engagement (fake likes, followers, etc.)</li>
              <li>No pyramid schemes or multi-level marketing</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Healthy Debate About Veganism</h2>
            <p className="text-gray-700 mb-4">
              We welcome thoughtful discussion about veganism and related topics:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Share different perspectives respectfully</li>
              <li>Back up health claims with reliable sources</li>
              <li>Acknowledge that not everyone has the same access or circumstances</li>
              <li>Avoid purity tests or gatekeeping ("you're not vegan enough")</li>
              <li>Support reduction and transition approaches</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Privacy and Safety</h2>
            <p className="text-gray-700 mb-4">
              Protect your privacy and that of others:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Don't share personal information (addresses, phone numbers, etc.)</li>
              <li>Be cautious about sharing your location</li>
              <li>Don't impersonate others or create fake accounts</li>
              <li>Report suspicious accounts or scams</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. Moderation and Enforcement</h2>
            <p className="text-gray-700 mb-4">
              Our moderation team works to maintain a positive community:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li><strong>Warnings:</strong> First-time minor violations may result in a warning</li>
              <li><strong>Content Removal:</strong> Violating content will be removed</li>
              <li><strong>Temporary Suspension:</strong> Repeated or moderate violations may result in temporary account suspension</li>
              <li><strong>Permanent Ban:</strong> Serious or repeated violations may result in permanent account termination</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">11. Reporting Violations</h2>
            <p className="text-gray-700 mb-4">
              If you see content that violates these guidelines:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Use the report button on posts, comments, or profiles</li>
              <li>Provide specific information about the violation</li>
              <li>Don't engage or retaliate</li>
              <li>Trust our moderation team to review and take appropriate action</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">12. Appeals</h2>
            <p className="text-gray-700 mb-4">
              If you believe a moderation decision was made in error:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Contact us at hello@cleareds.com</li>
              <li>Include relevant details and context</li>
              <li>Be respectful in your appeal</li>
              <li>We will review and respond within 7 business days</li>
            </ul>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Remember</h3>
              <p className="text-blue-800">
                PlantsPack is what we make it together. By following these guidelines, you help create a welcoming,
                positive space for everyone to share their plant-based journey. Thank you for being part of our
                community!
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Questions?</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about these Community Guidelines, please contact us:
            </p>
            <ul className="list-none text-gray-700 mb-4 space-y-2">
              <li><strong>Email:</strong> hello@cleareds.com</li>
              <li><strong>Contact Form:</strong>{' '}
                <Link href="/contact" className="text-green-600 hover:text-green-700 underline">
                  Contact Us
                </Link>
              </li>
            </ul>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4">
                By using PlantsPack, you agree to follow these Community Guidelines.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/legal/terms"
                  className="text-green-600 hover:text-green-700 underline text-sm"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/legal/privacy"
                  className="text-green-600 hover:text-green-700 underline text-sm"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/contact"
                  className="text-green-600 hover:text-green-700 underline text-sm"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
