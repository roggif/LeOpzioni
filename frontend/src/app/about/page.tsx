import Image from 'next/image';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col items-center py-16 px-4">
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 text-center">Who we are</h1>
            <div className="w-full max-w-4xl mb-12 text-center mx-auto space-y-6 px-2 md:px-8">
              <p className="text-2xl md:text-3xl font-semibold text-gray-800">
                We are a dynamic team blending quantitative expertise with cutting-edge technology.
              </p>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                Our specialists excel in financial-market analysis and algorithmic trading. We harness advanced tools to transform complex data into actionable, innovative solutions.
                <span className="block mt-2">
                  We use <span className="font-medium text-purple-700">Python</span> for sophisticated processing, collaborate on <span className="font-medium text-purple-700">GitHub</span> for open-source projects, and leverage <span className="font-medium text-purple-700">MQL5</span> to automate trading strategies.
                </span>
              </p>
            </div>
      <div className="flex flex-col md:flex-row items-center max-w-4xl w-full bg-white/80 rounded-2xl shadow-lg p-8 md:p-12 gap-8">
        <div className="flex-shrink-0">
          <Image
            src="/about-pic.png"
            alt="Gabriele Gatto"
            width={280}
            height={340}
            className="rounded-xl border border-gray-200 shadow-md object-cover"
            priority
          />
        </div>
        <div className="flex-1 text-gray-800 text-lg space-y-6">
          <p>
            <span className="font-semibold">Gabriele Gatto</span> is the creative engine behind our innovative project. With a solid background in quantitative finance and a deep passion for programming, he has seamlessly fused advanced analytics with cutting-edge technology.
          </p>
          <p>
            By harnessing Python, he has developed sophisticated algorithms for financial-market analysis, while his activity on GitHub reflects an unwavering commitment to collaborative excellence and open-source development. His expertise with MQL5 showcases his ability to translate quantitative strategies into automated trading solutions. Expanding his web-development skills led to the creation of Callz, our flagship quantitative-analysis tool.
          </p>
          <p>
            Investment specialist, holder of a Master&apos;s degree in Economics and Finance from Università Cattolica di Milano, he now works for an Italian private-finance firm.
          </p>
          <blockquote className="border-l-4 border-purple-400 pl-4 italic text-gray-700">
            His mission is simple: &ldquo;to make the complexity of financial markets accessible and transparent.&rdquo;
          </blockquote>
        </div>
      </div>
      
      <div className="max-w-4xl w-full mt-8 bg-white/80 rounded-2xl shadow-lg p-4 md:p-8 text-center">
        <p className="text-lg text-gray-700 mb-4">
          His Italian-language master&apos;s thesis—focused on pairs trading and a statistical study for options trading implemented in Python—is available for download, completely open source, on his GitHub repository at the following link:
        </p>
        <Link href="https://github.com/gabri035/Le-Opzioni-OPLY/tree/main" target="_blank" className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200">
          Le Opzioni
        </Link>
      </div>
    </div>
  );
} 