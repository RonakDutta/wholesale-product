import { TrendingUp, ArrowRight } from "lucide-react";

const MarketAlert = ({
  category = "Packaging Materials",
  region = "Delhi NCR",
  changePercent = 18,
  onActionClick,
}) => {
  return (
    <div className="bg-white border border-slate-200 border-l-4 border-l-clay rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
        <div className="relative shrink-0 p-2 bg-clay/10 rounded-full">
          <TrendingUp
            className="w-4 h-4 sm:w-5 sm:h-5 text-clay"
            strokeWidth={2.5}
          />
          {/* small live-signal dot instead of a full-icon pulse */}
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-clay rounded-full">
            <span className="absolute inset-0 rounded-full bg-clay animate-ping" />
          </span>
        </div>

        <div>
          <div className="inline-flex items-center bg-cream border border-clay/30 text-clay text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm mb-1.5">
            Market alert
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-snug">
            Demand rising in{" "}
            <span className="text-slate-900 font-semibold">{category}</span> for{" "}
            {region}
          </p>
          <p className="font-mono text-[10px] sm:text-[11px] text-slate-400 mt-1">
            <span className="text-clay font-bold">+{changePercent}%</span>{" "}
            search volume this week
          </p>
        </div>
      </div>

      {/* <button
        onClick={onActionClick}
        className="group flex items-center justify-center gap-1.5 bg-clay text-white text-xs font-semibold px-5 py-2 rounded-sm hover:bg-clay/90 transition-colors cursor-pointer w-full sm:w-auto shrink-0 shadow-sm"
      >
        <span>View deals</span>
        <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </button> */}
    </div>
  );
};

export default MarketAlert;
