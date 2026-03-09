import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, School, User, ArrowRight, UtensilsCrossed, BarChart3, QrCode, ShieldCheck, Zap, Smile } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-primary/20 dark text-foreground relative bg-transparent">

      {/* Background Image & Overlay */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/home-bg.jpg')",
          filter: "blur(4px)",
          transform: "scale(1.05)"
        }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-0 bg-black/45" aria-hidden="true" />

      {/* Navbar - Ensure z-50 is maintained */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              MealMatrix Systems
            </span>
          </Link>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="default" className="rounded-full px-6 font-medium shadow-md hover:shadow-lg transition-all bg-primary hover:bg-primary/90 text-white border-0">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">

          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-slate-200 backdrop-blur-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
              v2.0 Now Available
            </div>

            <h1 className="mb-6 text-5xl font-extrabold tracking-tight sm:text-7xl md:text-8xl text-white animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both drop-shadow-xl">
              MealMatrix<br />
              <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
                Systems
              </span>
            </h1>

            <p className="mb-10 text-xl text-slate-200 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-900 fill-mode-both drop-shadow-sm">
              Smart meal operations with full control and zero waste.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 fill-mode-both">
              <Link href="/login">
                <Button size="lg" className="text-lg px-8 py-6 h-auto rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all duration-300 bg-primary hover:bg-primary/90 text-white border-0">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section className="py-24 bg-black/20 backdrop-blur-sm border-t border-white/5">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-white">Tailored for Everyone</h2>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                Clean interfaces designed specifically for the needs of Admins, Mess Owners, and Students.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-24">
              {/* Admin Card */}
              <Card className="border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-black/40 backdrop-blur-md group hover:border-blue-500/50">
                <CardHeader>
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <School className="w-6 h-6 text-blue-400" />
                  </div>
                  <CardTitle className="text-xl text-white">Campus Admin</CardTitle>
                  <CardDescription className="text-base text-slate-400">
                    Monitor hostel performance, track expenses, and manage user roles from a central dashboard.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-400">
                    <li className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-blue-500" /> System Control</li>
                    <li className="flex items-center"><BarChart3 className="w-4 h-4 mr-2 text-blue-500" /> Analytics Reports</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Owner Card */}
              <Card className="border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-black/40 backdrop-blur-md group hover:border-orange-500/50">
                <CardHeader>
                  <div className="h-12 w-12 rounded-2xl bg-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <ChefHat className="w-6 h-6 text-orange-400" />
                  </div>
                  <CardTitle className="text-xl text-white">Mess Owner</CardTitle>
                  <CardDescription className="text-base text-slate-400">
                    Manage menus, track innovative real-time stats, and ensure smooth daily operations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-400">
                    <li className="flex items-center"><QrCode className="w-4 h-4 mr-2 text-orange-500" /> QR Attendance</li>
                    <li className="flex items-center"><BarChart3 className="w-4 h-4 mr-2 text-orange-500" /> Live Stats</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Student Card */}
              <Card className="border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-black/40 backdrop-blur-md group hover:border-green-500/50">
                <CardHeader>
                  <div className="h-12 w-12 rounded-2xl bg-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <User className="w-6 h-6 text-green-400" />
                  </div>
                  <CardTitle className="text-xl text-white">Student</CardTitle>
                  <CardDescription className="text-base text-slate-400">
                    Book meals in advance, use digital entry passes, and stay updated with notifications.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-400">
                    <li className="flex items-center"><QrCode className="w-4 h-4 mr-2 text-green-500" /> Digital Meal Pass</li>
                    <li className="flex items-center"><Smile className="w-4 h-4 mr-2 text-green-500" /> Smart Notifications</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Section Divider */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-20"></div>

            {/* Core Features Section */}
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h3 className="text-2xl font-bold text-white mb-4">Core Features</h3>
                <div className="h-1 w-20 bg-primary/50 mx-auto rounded-full"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Feature 1 */}
                <div className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Rapid Access Control</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">Facilitate seamless, high-volume entry management with sub-second QR code verification, ensuring zero congestion.</p>
                </div>

                {/* Feature 2 */}
                <div className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400 group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Operational Intelligence</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">Gain actionable insights into dining trends and peak usage periods with granular, real-time data visualization.</p>
                </div>

                {/* Feature 3 */}
                <div className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-yellow-500/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center mb-4 text-yellow-400 group-hover:scale-110 transition-transform duration-300">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Proactive Communication</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">Automate critical updates for menus, booking confirmations, and administrative announcements via instant notifications.</p>
                </div>

                {/* Feature 4 */}
                <div className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-red-500/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center mb-4 text-red-400 group-hover:scale-110 transition-transform duration-300">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Enterprise Security</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">Ensure data integrity with strict, role-specific access protocols and secure authentication standards.</p>
                </div>

                {/* Feature 5 */}
                <div className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-green-500/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center mb-4 text-green-400 group-hover:scale-110 transition-transform duration-300">
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Predictive Optimization</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">Leverage machine learning algorithms to forecast consumption patterns, minimizing food waste and costs.</p>
                </div>

                {/* Feature 6 */}
                <div className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-slate-500/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className="h-10 w-10 rounded-lg bg-slate-500/20 flex items-center justify-center mb-4 text-slate-400 group-hover:scale-110 transition-transform duration-300">
                    <Smile className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Scalable Infrastructure</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">Built on a robust, cloud-native architecture designed to scale effortlessly with your institution's growth.</p>
                </div>

              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 py-12 bg-black/80 backdrop-blur-md">
          <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <UtensilsCrossed className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">MealMatrix Systems</span>
            </div>
            <p className="text-sm text-slate-400">
              &copy; {new Date().getFullYear()} MealMatrix Systems Inc. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-slate-400">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </main>
    </div >
  );
}
