import { Outlet } from "react-router-dom";

const InfoLayout = () => {
  return (
    <div className="min-h-screen bg-cream text-espresso">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default InfoLayout;
