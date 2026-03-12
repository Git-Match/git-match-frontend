import { type FC } from 'react';
import BgGradient from '../components/ui/BgGradient';
import GitMatchHeroImageURL from '../assets/git-match-hero-img.png';
import Header from '../components/layout/Header';

const LandingPage: FC = () => {
  // Handler for the "Get Started" button
  const onGetStarted = () => {
    console.log('Get Started Clicked');
  };

  return (
    <>
      {/* Main Page Container */}
      <div className="flex min-h-screen w-screen flex-col overflow-x-hidden text-white">
        <BgGradient />
        <Header />
        {/* Main Content */}
        <main className="flex flex-1 items-center justify-center p-4 pt-28 md:pt-16">
          <div className="container mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 md:grid-cols-2 md:gap-10 lg:px-8">
            {/* Left Side: Hero Text & CTA */}
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              {/* Title */}
              <h1 className="font-pixel text-7xl leading-tight text-white lg:text-9xl">
                GIT MATCH
              </h1>

              {/* Subtitle */}
              <p className="font-pixel mb-10 max-w-lg text-lg text-gray-300 md:text-4xl">
                Find your perfect one to commit...
              </p>

              {/* CTA Button */}
              <div className="relative h-16 w-full max-w-sm rounded-full bg-white">
                {/* Gradient Button - Positioned absolutely to create the 'pill inside pill' look */}
                <button
                  onClick={onGetStarted}
                  className="transition-transition absolute top-1.5 bottom-1.5 left-1.5 flex w-[55%] cursor-pointer items-center justify-center rounded-full bg-linear-to-tr from-pink-500 to-purple-700 text-xl font-bold text-white duration-300 hover:scale-105"
                >
                  Get Started
                </button>
              </div>

              {/* Tech Icons */}
              <div className="mt-12 flex items-center space-x-8 md:mt-16 md:space-x-12">
                {/* Floating Side Circles (Visible on desktop) */}
                <div className="hidden flex-col gap-6 md:flex">
                  <div className="h-5 w-5 rounded-full bg-white opacity-30"></div>
                  <div className="h-5 w-5 rounded-full bg-white opacity-30"></div>
                  <div className="h-5 w-5 rounded-full bg-white opacity-30"></div>
                </div>
              </div>
            </div>

            {/* Right Side: Illustration */}
            <div className="relative flex items-center justify-center">
              <img
                // Using a placeholder as the user did not provide the asset
                src={GitMatchHeroImageURL}
                alt="Couple holding hands"
                className="w-svw" // Responsive image size
                onError={(e) =>
                  ((e.target as HTMLImageElement).src =
                    'https://placehold.co/500x500/FFFFFF/000000?text=Illustration_Fallback')
                }
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default LandingPage;
