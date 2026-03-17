export default function BgGradient() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#05010b]" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_38%)] opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(122,28,172,0.14),transparent_50%)]" />

      <div className="absolute -top-[12vh] -left-[18vw] h-[clamp(18rem,42vw,42rem)] w-[clamp(18rem,42vw,42rem)] animate-pulse rounded-full bg-[#4C148B] opacity-60 blur-[110px] sm:blur-[150px]" />
      <div className="absolute top-[4vh] right-[-16vw] h-[clamp(20rem,46vw,48rem)] w-[clamp(20rem,46vw,48rem)] rounded-full bg-[#C2188F] opacity-45 blur-[120px] sm:blur-[170px]" />
      <div className="absolute bottom-[-18vh] left-[8vw] h-[clamp(16rem,34vw,30rem)] w-[clamp(16rem,34vw,30rem)] rounded-full bg-[#731847] opacity-30 blur-[120px]" />
      <div className="absolute right-[4vw] bottom-[-20vh] h-[clamp(18rem,40vw,40rem)] w-[clamp(18rem,40vw,40rem)] animate-pulse rounded-full bg-[#120B38] opacity-85 blur-[140px] sm:blur-[190px]" />
      <div className="absolute top-[36%] left-1/2 h-[clamp(16rem,34vw,30rem)] w-[clamp(16rem,34vw,30rem)] -translate-x-1/2 rounded-full bg-[#8427AE] opacity-30 blur-[120px] sm:blur-[160px]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_32%,rgba(5,1,11,0.72)_100%)]" />
    </div>
  );
}
