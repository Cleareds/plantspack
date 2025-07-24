import Feed from "@/components/posts/Feed";

export default function Home() {
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to VeganConnect
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Connect with fellow vegans, share your plant-based journey, and discover amazing vegan places and events.
          </p>
        </div>
        <Feed />
      </div>
    </div>
  );
}
