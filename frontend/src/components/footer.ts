export function Footer(): HTMLElement {
  const footer = document.createElement('footer');
  footer.className = 'border-t border-tan/30 mt-auto';

  footer.innerHTML = `
    <div class="w-full px-4 lg:px-12 py-6">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <!-- Logo / Brand -->
        <div class="flex items-center gap-2">
          <span class="text-navy-muted text-sm">ft_transcendence by</span>
          <span class="text-lg font-bold">
            <span class="text-blue">KING PONG</span>
          </span>
        </div>

        <!-- Links -->
        <div class="flex items-center gap-6">
          <a href="/privacy" class="text-navy-muted hover:text-blue transition-colors text-sm">
            Privacy Policy
          </a>
          <a href="/terms" class="text-navy-muted hover:text-blue transition-colors text-sm">
            Terms of Service
          </a>
          <a href="mailto:rcheong@student.42kl.edu.my" class="text-navy-muted hover:text-blue transition-colors text-sm">
            Contact
          </a>
        </div>

        <!-- Copyright -->
        <div class="text-navy-muted text-sm">
          © ${new Date().getFullYear()} KING PONG. 42 KL Project.
        </div>
      </div>
    </div>
  `;

  return footer;
}
