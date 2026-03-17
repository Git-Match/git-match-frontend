import { useState } from 'react';
import { GithubIcon } from '../ui/GithubIcon';
import { MenuIcon } from '../ui/MenuIcon';
import { CloseIcon } from '../ui/CloseIcon';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Navigation links data
  const navLinks = [
    { name: 'HOME', href: 'home' },
    { name: 'FEATURES', href: 'features' },
    { name: 'ABOUT', href: 'about' },
    { name: 'CONTACT', href: 'contact' },
  ];
  return (
    <>
      {/* Header Navigation */}
      <header className="absolute top-0 right-0 left-0 z-20 p-4 md:px-10">
        <nav className="container mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="shrink-0">
            <GithubIcon className="h-10 w-10 text-white" />
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium transition-colors hover:text-purple-300"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="z-30 md:hidden" // z-30 to be above the overlay
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <CloseIcon className="h-8 w-8" /> : <MenuIcon className="h-8 w-8" />}
          </button>
        </nav>
      </header>
      {/* Mobile Menu Overlay */}
      <nav
        className={`bg-gradient-custom fixed inset-0 z-10 flex flex-col items-center justify-center gap-10 transition-transform duration-300 ease-in-out md:hidden ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {navLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            className="text-3xl font-medium transition-colors hover:text-purple-300"
            onClick={() => setIsMenuOpen(false)} // Close menu on link click
          >
            {link.name}
          </a>
        ))}
      </nav>
    </>
  );
}

export default Header;
