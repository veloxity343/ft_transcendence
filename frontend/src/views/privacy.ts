export function PrivacyPolicyView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex-1 flex items-center justify-center px-4 lg:px-12 py-8';

  container.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <div class="glass-card p-8">
        <h1 class="text-3xl font-bold text-navy mb-2">Privacy Policy</h1>
        <p class="text-navy-muted mb-4">Last updated: December 2025</p>

        <div class="space-y-6 text-navy" style="font-family: 'Times New Roman', Times, serif;">
          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">1. Introduction</h2>
            <p class="leading-relaxed">
              Welcome to KING PONG ("ft_transcendence"). This Privacy Policy explains how we collect, use, 
              disclose, and safeguard your information when you use our multiplayer Pong game platform. 
              This project was created as part of the 42 curriculum by rcheong, nbinnazl, and hetan.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">2. Information We Collect</h2>
            <p class="leading-relaxed mb-3">We collect information that you provide directly to us:</p>
            <ul class="list-disc list-inside space-y-2 ml-4">
              <li><strong>Account Information:</strong> Username, email address, and password (hashed and salted)</li>
              <li><strong>Profile Information:</strong> Avatar image, display preferences</li>
              <li><strong>Game Data:</strong> Match history, scores, ELO ratings, tournament participation</li>
              <li><strong>Communication Data:</strong> Chat messages sent through our platform</li>
              <li><strong>Authentication Data:</strong> OAuth tokens if you sign in via Google or other providers</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">3. How We Use Your Information</h2>
            <p class="leading-relaxed mb-3">We use the information we collect to:</p>
            <ul class="list-disc list-inside space-y-2 ml-4">
              <li>Create and manage your account</li>
              <li>Facilitate multiplayer games and matchmaking</li>
              <li>Track game statistics and leaderboard rankings</li>
              <li>Enable communication between players via chat</li>
              <li>Organize and manage tournaments</li>
              <li>Improve and optimize our platform</li>
              <li>Ensure fair play and prevent cheating</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">4. Data Storage and Security</h2>
            <p class="leading-relaxed">
              Your data is stored in an SQLite database. We implement industry-standard security measures including:
            </p>
            <ul class="list-disc list-inside space-y-2 ml-4 mt-3">
              <li>Password hashing with salt</li>
              <li>HTTPS encryption for all data in transit</li>
              <li>JWT tokens for secure authentication</li>
              <li>Two-Factor Authentication (2FA) option for enhanced security</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">5. Data Sharing</h2>
            <p class="leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. Your game statistics 
              and username may be visible to other users through leaderboards and match history features. 
              Chat messages are only visible to intended recipients.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">6. Your Rights</h2>
            <p class="leading-relaxed mb-3">You have the right to:</p>
            <ul class="list-disc list-inside space-y-2 ml-4">
              <li>Access your personal data</li>
              <li>Update or correct your information</li>
              <li>Delete your account and associated data</li>
              <li>Export your data in a readable format</li>
              <li>Opt out of optional communications</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">7. Cookies and Local Storage</h2>
            <p class="leading-relaxed">
              We use browser local storage to maintain your session, store authentication tokens, 
              and remember your preferences (such as chat settings and ignored users). 
              These are essential for the application to function properly.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">8. Children's Privacy</h2>
            <p class="leading-relaxed">
              Our platform is not intended for users under the age of 13. We do not knowingly collect 
              personal information from children under 13. If you believe we have collected such information, 
              please contact us immediately.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">9. Changes to This Policy</h2>
            <p class="leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">10. Contact Us</h2>
            <p class="leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
              <a href="mailto:rcheong@student.42kl.edu.my" class="text-blue hover:underline ml-1">
                rcheong@student.42kl.edu.my
              </a>
            </p>
          </section>
        </div>

        <div class="mt-8 pt-6 border-t border-tan/30">
          <a href="/" class="text-blue hover:text-blue-dark font-semibold mt-8 inline-block" style="font-family: 'Times New Roman', Times, serif;">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  `;

  return container;
}
