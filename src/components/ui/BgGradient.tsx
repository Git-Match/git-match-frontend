export default function BgGradient() {
  return (
    <div className="fixed -z-10 h-screen w-screen overflow-hidden bg-black">
      {/* Deep Purple */}
      <div className="absolute -top-20 -left-20 h-[600px] w-[600px] animate-pulse rounded-full bg-[#2A006B] opacity-80 blur-[200px]"></div>
      {/* Magenta Blob */}
      <div className="absolute top-10 right-0 h-[700px] w-[700px] rounded-full bg-[#A100B8] opacity-80 blur-[250px]"></div>
      {/* Dark Red Blob */}
      <div className="absolute bottom-0 left-10 h-[500px] w-[500px] rounded-full bg-[#5A0020] opacity-30 blur-[200px]"></div>
      {/* Deep Navy */}
      <div className="absolute right-20 bottom-0 h-[700px] w-[700px] animate-pulse rounded-full bg-[#070014] opacity-90 blur-[300px]"></div>
      {/* Bright Purple Edge */}
      <div className="absolute top-1/2 left-1/3 h-[900px] w-[900px] rounded-full bg-[#7F00A6] opacity-50 blur-[300px]"></div>
    </div>
  );
}
