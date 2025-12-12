export function TermsOfServiceView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex-1 flex items-center justify-center px-4 lg:px-12 py-8';

  container.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <div class="glass-card p-8">
        <h1 class="text-3xl font-bold text-navy mb-2">Terms of Service</h1>
        <p class="text-navy-muted mb-4">Last updated: December 2025</p>

        <div class="space-y-6 text-navy" style="font-family: 'Times New Roman', Times, serif;">
          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">1. Acceptance of Terms</h2>
            <p class="leading-relaxed">
              By accessing or using ft_transcendence, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our platform. This project was created as part 
              of the 42 curriculum by rcheong, nbinnazl, and hetan of KING PONG.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">2. Description of Service</h2>
            <p class="leading-relaxed">
              ft_transcendence is a web-based multiplayer Pong game platform that allows users to play real-time 
              matches against other players or AI opponents, participate in tournaments, track statistics, 
              and communicate via chat. The platform is provided for educational and entertainment purposes.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">3. User Accounts</h2>
            <ul class="list-disc list-inside space-y-2 ml-4">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must be at least 13 years old to create an account</li>
              <li>One person may only maintain one account</li>
              <li>You are responsible for all activities that occur under your account</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">4. User Conduct</h2>
            <p class="leading-relaxed mb-3">When using our platform, you agree NOT to:</p>
            <ul class="list-disc list-inside space-y-2 ml-4">
              <li>Use cheats, exploits, automation software, or any unauthorized third-party tools</li>
              <li>Harass, abuse, or threaten other users</li>
              <li>Use offensive, inappropriate, or discriminatory usernames or avatars</li>
              <li>Send spam, offensive, or harmful content through chat</li>
              <li>Attempt to gain unauthorized access to other accounts or systems</li>
              <li>Intentionally disconnect or abandon games to manipulate rankings</li>
              <li>Create multiple accounts to manipulate matchmaking or rankings</li>
              <li>Impersonate other users or staff members</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">5. Game Rules and Fair Play</h2>
            <ul class="list-disc list-inside space-y-2 ml-4">
              <li>All games must be played fairly without the use of external assistance</li>
              <li>Intentional disconnection during games may result in automatic forfeit</li>
              <li>ELO ratings and statistics reflect your actual performance</li>
              <li>Tournament rules must be followed; violations may result in disqualification</li>
              <li>Match results are final once recorded by the system</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">6. Chat and Communication</h2>
            <p class="leading-relaxed mb-3">Our chat feature is provided for player communication. You agree to:</p>
            <ul class="list-disc list-inside space-y-2 ml-4">
              <li>Communicate respectfully with other players</li>
              <li>Not share personal information of others without consent</li>
              <li>Not use chat for advertising or commercial purposes</li>
              <li>Use the ignore/block feature for unwanted communications</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">7. Intellectual Property</h2>
            <p class="leading-relaxed">
              The platform, including its design, code, and content, is created as an educational 
              project for the 42 curriculum. The classic Pong game concept is in the public domain. 
              User-generated content (avatars, chat messages) remains the property of the respective users.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">8. Account Termination</h2>
            <p class="leading-relaxed">
              We reserve the right to suspend or terminate accounts that violate these Terms of Service. 
              Reasons for termination may include cheating, harassment, abuse, or any other violation of 
              these terms. You may also delete your own account at any time through the settings page.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">9. Disclaimers</h2>
            <ul class="list-disc list-inside space-y-2 ml-4">
              <li>The platform is provided "as is" without warranties of any kind</li>
              <li>We do not guarantee uninterrupted or error-free service</li>
              <li>This is an educational project and may contain bugs or issues</li>
              <li>We are not responsible for any data loss or service interruptions</li>
              <li>Rankings and statistics are for entertainment purposes</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">10. Limitation of Liability</h2>
            <p class="leading-relaxed">
              As this is an educational project created for the 42 curriculum, the developers (rcheong, nbinnazl, hetan) 
              shall not be liable for any indirect, incidental, special, or consequential damages arising from 
              your use of the platform.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">11. Changes to Terms</h2>
            <p class="leading-relaxed">
              We may modify these Terms of Service at any time. Continued use of the platform after changes 
              constitutes acceptance of the new terms. We encourage you to review these terms periodically.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-blue mt-4 mb-3">12. Contact Information</h2>
            <p class="leading-relaxed">
              For questions or concerns about these Terms of Service, please contact us at:
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
