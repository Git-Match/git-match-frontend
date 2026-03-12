import { useState, type ChangeEvent, type FC } from 'react';
import BgGradient from '../components/ui/BgGradient';
import { InputField } from '../components/ui/InputField';

const Profile: FC = () => {
  function calculateAge(dobString: string): number {
    const dob = new Date(dobString); // "MM/DD/YYYY"
    const today = new Date();

    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const dayDiff = today.getDate() - dob.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    return age;
  }

  const [profileData, setProfileData] = useState({
    fullName: 'Jane Doe',
    role: 'Frontend Developer',
    location: 'NYC',
    about: 'I love coding and collaborating on open source projects!',
    dob: '10/06/2002',
  });
  const age = calculateAge(profileData.dob);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const profilePicture =
    'https://images.unsplash.com/photo-1554083021-dd6b85a6d423?q=80&w=150&h=150&fit=crop';

  return (
    <div className="relative flex min-h-screen w-screen flex-col items-center overflow-x-hidden text-white md:justify-center">
      <BgGradient />

      <div className="my-4 w-full max-w-7xl px-4 md:px-8">
        {/* Main Card */}
        <div className="grid grid-cols-1 overflow-hidden rounded-4xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-sm md:grid-cols-5">
          {/* LEFT: FORM SECTION */}
          <div className="col-span-1 p-6 md:col-span-3 md:p-10">
            <h2 className="mb-6 pb-3 text-2xl font-bold text-white">Profile Setting</h2>

            <div className="grid grid-cols-3 gap-6">
              {/* Input Column */}
              <div className="col-span-3 space-y-4 md:col-span-2">
                <InputField
                  onChange={handleChange}
                  name="fullName"
                  label="Full Name"
                  value={profileData.fullName}
                />
                <InputField
                  onChange={handleChange}
                  name="age"
                  label="Age"
                  value={String(age)}
                  disabled
                  readOnly
                  className="cursor-not-allowed"
                  type="number"
                />
                <InputField
                  onChange={handleChange}
                  name="role"
                  label="Role/Area of interest"
                  value={profileData.role}
                />
                <InputField
                  onChange={handleChange}
                  name="githubURL"
                  label="Github Profile Link (Authentication required)"
                  value="https://github.com/janedoe"
                />
                <InputField
                  onChange={handleChange}
                  name="location"
                  label="Location"
                  value={profileData.location}
                />
                <InputField
                  onChange={handleChange}
                  name="about"
                  label="About me"
                  value={profileData.about}
                />
                <InputField
                  onChange={handleChange}
                  name="dob"
                  label="Date of Birth"
                  value={profileData.dob}
                  type="date"
                />
                <InputField onChange={handleChange} name="others" label="Others" />
              </div>

              {/* Upload Column */}
              <div className="col-span-3 flex flex-col items-center md:col-span-1">
                <img
                  src={profilePicture}
                  alt="Upload Preview"
                  className="mb-3 h-28 w-28 rounded-full border-4 border-purple-500/50 object-cover"
                />
                <button className="cursor-pointer text-sm text-gray-300 transition-colors hover:text-white">
                  Upload Image
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 pt-4">
              <button className="w-40 cursor-pointer rounded-full bg-linear-to-r from-purple-600 to-fuchsia-500 py-3 font-bold tracking-wider text-white shadow-lg shadow-purple-500/40 transition-transform hover:scale-105">
                SAVE
              </button>
            </div>
          </div>

          {/* RIGHT: PREVIEW SECTION */}
          <div className="relative col-span-1 hidden min-h-[300px] md:col-span-2 md:flex md:min-h-full">
            <img
              src="https://images.unsplash.com/photo-1605776332618-6f0b905be303?q=80&w=1500&auto=format&fit=crop"
              alt="Profile Preview Background"
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />

            {/* Overlay */}
            <div className="absolute inset-0 flex flex-col justify-end bg-black/30 p-6 backdrop-blur-xs">
              {/* Top Info Bar */}
              <div className="mb-4 flex items-center justify-between rounded-lg bg-black/45 p-3">
                <div className="flex items-center">
                  <img
                    src={profilePicture}
                    alt="User Profile"
                    className="mr-3 h-12 w-12 rounded-full object-cover"
                  />
                  <div className="text-sm">
                    <p className="font-bold text-white">
                      {profileData.fullName}, {age}
                    </p>
                    <p className="text-gray-300">Frontend Developer, NYC</p>
                  </div>
                </div>
                <button className="cursor-pointer text-sm font-medium text-purple-300 transition-colors hover:text-white">
                  View Gallery
                </button>
              </div>

              {/* Summary Block */}
              <div className="rounded-lg bg-black/45 p-4">
                <div className="mb-4 space-y-1 text-sm text-white">
                  <p className="text-purple-300">&lt;About me </p>
                  <p className="line-clamp-2 pl-4 text-xs text-gray-200">
                    value="{profileData.about}"
                  </p>
                  <p className="text-purple-300">&gt;</p>
                </div>

                {/* GitHub Stats */}
                <div className="mb-4 flex items-center gap-2">
                  <div className="rounded bg-purple-500/80 px-2 py-0.5 text-xs font-medium">
                    <span className="mr-1 text-white">31</span>
                    Repos
                  </div>
                  <div className="rounded bg-purple-500/80 px-2 py-0.5 text-xs font-medium">
                    <span className="mr-1 text-white">78</span>
                    Commits
                  </div>
                </div>

                {/* Languages */}
                <p className="mb-2 text-sm text-purple-300"># Top Languages</p>
                <div className="flex flex-wrap gap-2">
                  {['JavaScript', 'Python', 'HTML', 'TypeScript'].map((lang) => (
                    <span
                      key={lang}
                      className="rounded-full bg-purple-700/80 px-2 py-1 text-xs text-white"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
