import { useState, type FC } from 'react';
import { GithubIcon } from '../components/ui/GithubIcon';
import { InputField } from '../components/ui/InputField';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Login: FC = () => {
  const [loginMode, setLoginMode] = useState('sign-up');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    githubProfileUrl: '',
    password: '',
  });

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const { signup, login } = useAuth();

  const handleLogin = async () => {
    const result = await login(formData.email, formData.password);
    console.log(result);
  };
  const handleSignUp = async () => {
    const dataToSend = {
      fullName: formData.fullName,
      email: formData.email,
      githubProfileUrl: formData.githubProfileUrl,
      password: formData.password,
    };
    const signupResult = await signup(dataToSend);
    console.log(signupResult);

    if (signupResult.success) {
      navigate('/onboarding');
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0f0a1e] p-4">
      {/* Card Container */}
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#1c1b2e]/80 shadow-2xl backdrop-blur-md md:flex-row">
        {/* Left Side: Form */}
        <div className="relative flex w-full flex-col p-8 md:w-5/12 md:p-12">
          {/* Background Gradient for Left Side (Subtle) */}
          <div className="pointer-events-none absolute top-0 left-0 h-full w-full bg-linear-to-br from-purple-900/20 via-transparent to-transparent"></div>

          {/* Toggle Pill */}
          <div className="relative z-10 mx-auto mb-16 flex h-14 w-full max-w-[280px] rounded-full bg-white p-1 shadow-lg">
            <button
              type="button"
              onClick={() => setLoginMode('sign-up')}
              className={`w-1/2 rounded-full text-sm font-bold tracking-wide text-gray-500 transition-colors duration-300 hover:text-gray-800 ${
                loginMode === 'sign-up'
                  ? 'bg-[#8b2fc9] text-white shadow-md'
                  : 'bg-transparent text-gray-500'
              }`}
            >
              SIGN UP
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('login')}
              className={`w-1/2 rounded-full text-sm font-bold tracking-wide text-gray-500 transition-colors duration-300 hover:text-gray-800 ${
                loginMode === 'login'
                  ? 'bg-[#8b2fc9] text-white shadow-md'
                  : 'bg-transparent text-gray-500'
              }`}
            >
              LOGIN
            </button>
          </div>

          {loginMode === 'sign-up' && (
            <div>
              {/* Form Fields */}
              <div className="mx-auto flex w-full max-w-xs flex-1 flex-col justify-center space-y-2">
                <InputField
                  label="Full Name"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                />
                <InputField
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
                <div className="flex items-start gap-4">
                  <InputField
                    label="Github Profile URL"
                    name="githubProfileUrl"
                    value={formData.githubProfileUrl}
                    onChange={handleChange}
                  />
                </div>
                <InputField
                  label="Password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              {/* Action Button */}
              <div className="mt-12 flex justify-center">
                <button
                  onClick={handleSignUp}
                  className="w-full max-w-[200px] rounded-full bg-linear-to-r from-[#a82ee6] to-[#7125d8] py-3 font-bold tracking-wider text-white shadow-lg shadow-purple-500/30 transition-transform hover:scale-105"
                >
                  SIGN UP
                </button>
              </div>
            </div>
          )}
          {loginMode === 'login' && (
            <div>
              {/* Form Fields */}
              <div className="mx-auto flex w-full max-w-xs flex-1 flex-col justify-center space-y-2">
                <InputField
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
                <InputField
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              {/* Action Button */}
              <div className="mt-12 flex justify-center">
                <button
                  onClick={handleLogin}
                  className="w-full max-w-[200px] rounded-full bg-linear-to-r from-[#a82ee6] to-[#7125d8] py-3 font-bold tracking-wider text-white shadow-lg shadow-purple-500/30 transition-transform hover:scale-105"
                >
                  LOGIN
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Image & Branding */}
        <div className="relative hidden h-full w-full md:block md:w-7/12">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1609464527830-881cc93789ef?q=80&w=2128&auto=format&fit=crop"
              alt="Developers coding"
              className="h-full w-full object-cover opacity-80"
            />
            {/* Overlay Gradient to match the theme */}
            <div className="absolute inset-0 bg-linear-to-t from-[#0f0a1e]/80 via-transparent to-[#0f0a1e]/30 mix-blend-multiply"></div>
          </div>

          {/* Content Overlay */}
          <div className="absolute top-10 right-0 left-0 z-10 flex flex-col items-center text-center">
            {/* Logo Area */}
            <div className="mb-1 flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-white opacity-20 blur-xl"></div>
                <GithubIcon className="relative z-10 h-12 w-12 text-white" />
              </div>
              <h1 className="font-pixel text-7xl tracking-widest text-white drop-shadow-lg">
                GIT MATCH
              </h1>
            </div>
            <p className="font-pixel text-xl tracking-wide text-gray-200 opacity-90 drop-shadow-md">
              Find your perfect one to commit...
            </p>
          </div>

          {/* Photo Credit (Optional/From Image) */}
          <div className="absolute right-6 bottom-4 text-[10px] text-gray-400 opacity-60">
            Photo by Danilo Rios on Unsplash
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
