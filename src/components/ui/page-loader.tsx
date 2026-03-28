"use client"

export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="relative w-[50px] aspect-square">
        <span className="absolute rounded-[50px] animate-loaderAnim shadow-[inset_0_0_0_3px] shadow-indigo-500/80 dark:shadow-indigo-400/80" />
        <span className="absolute rounded-[50px] animate-loaderAnim animation-delay shadow-[inset_0_0_0_3px] shadow-violet-500/80 dark:shadow-violet-400/80" />
        <style jsx>{`
          @keyframes loaderAnim {
            0% { inset: 0 27px 27px 0; }
            12.5% { inset: 0 27px 0 0; }
            25% { inset: 27px 27px 0 0; }
            37.5% { inset: 27px 0 0 0; }
            50% { inset: 27px 0 0 27px; }
            62.5% { inset: 0 0 0 27px; }
            75% { inset: 0 0 27px 27px; }
            87.5% { inset: 0 0 27px 0; }
            100% { inset: 0 27px 27px 0; }
          }
          .animate-loaderAnim {
            animation: loaderAnim 2.5s infinite;
          }
          .animation-delay {
            animation-delay: -1.25s;
          }
        `}</style>
      </div>
    </div>
  )
}

export function PageLoaderSmall() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="relative w-[32px] aspect-square">
        <span className="absolute rounded-[50px] animate-loaderAnimSm shadow-[inset_0_0_0_2px] shadow-indigo-500/70 dark:shadow-indigo-400/70" />
        <span className="absolute rounded-[50px] animate-loaderAnimSm animation-delay-sm shadow-[inset_0_0_0_2px] shadow-violet-500/70 dark:shadow-violet-400/70" />
        <style jsx>{`
          @keyframes loaderAnimSm {
            0% { inset: 0 17px 17px 0; }
            12.5% { inset: 0 17px 0 0; }
            25% { inset: 17px 17px 0 0; }
            37.5% { inset: 17px 0 0 0; }
            50% { inset: 17px 0 0 17px; }
            62.5% { inset: 0 0 0 17px; }
            75% { inset: 0 0 17px 17px; }
            87.5% { inset: 0 0 17px 0; }
            100% { inset: 0 17px 17px 0; }
          }
          .animate-loaderAnimSm {
            animation: loaderAnimSm 2.5s infinite;
          }
          .animation-delay-sm {
            animation-delay: -1.25s;
          }
        `}</style>
      </div>
    </div>
  )
}
