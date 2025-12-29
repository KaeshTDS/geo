
import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Map, Trophy, Settings, Home, Globe as GlobeIcon, PlusCircle, User, ArrowLeft, ArrowRight, CheckCircle, ChevronRight, BarChart2, Sparkles, Languages, X, Volume2, Loader2 } from 'lucide-react';
import { Adventure, UserProfile, AdventureProgress } from './types';
import { generateAdventure, generateStoryImage, generateSpeech } from './services/gemini';

// Helper for Base64 Decoding
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper for Audio Data Decoding (Raw PCM to AudioBuffer)
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Supported Languages
const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { code: 'zh', name: 'Chinese', native: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
];

const UI_STRINGS: Record<string, any> = {
  en: {
    welcome: "Adventure is calling! Ready to learn?",
    enterName: "Enter your name:",
    imAKid: "I'm a Kid",
    imAParent: "I'm a Parent",
    hello: "Hello",
    points: "adventure points!",
    recentAdventures: "Your Recent Adventures",
    exploreGlobe: "Explore the Globe",
    pickPlace: "Pick a place on the map!",
    createCustom: "Create Custom Adventure",
    whereToTravel: "Where do you want to travel to?",
    generate: "Generate Adventure",
    magicLoading: "Magic Loading...",
    next: "Next",
    back: "Back",
    startQuiz: "Start Quiz",
    finish: "Finish Adventure",
    pointsEarned: "You earned",
    returnMap: "Return to Map",
    language: "Language",
    parentDash: "Parent Dashboard",
    storiesCompleted: "Stories Completed",
    explorerRank: "Explorer Rank",
    signOut: "Sign Out",
    listen: "Listen",
  },
  ms: {
    welcome: "Pengembaraan memanggil! Sedia untuk belajar?",
    enterName: "Masukkan nama anda:",
    imAKid: "Saya Kanak-kanak",
    imAParent: "Saya Ibu Bapa",
    hello: "Helo",
    points: "mata pengembaraan!",
    recentAdventures: "Pengembaraan Terbaru Anda",
    exploreGlobe: "Teroka Dunia",
    pickPlace: "Pilih tempat pada peta!",
    createCustom: "Cipta Pengembaraan Sendiri",
    whereToTravel: "Ke mana anda mahu mengembara?",
    generate: "Cipta Pengembaraan",
    magicLoading: "Sihir Sedang Memuatkan...",
    next: "Seterusnya",
    back: "Kembali",
    startQuiz: "Mula Kuiz",
    finish: "Tamat Pengembaraan",
    pointsEarned: "Anda mendapat",
    returnMap: "Kembali ke Peta",
    language: "Bahasa",
    parentDash: "Papan Pemuka Ibu Bapa",
    storiesCompleted: "Cerita Selesai",
    explorerRank: "Pangkat Penjelajah",
    signOut: "Log Keluar",
    listen: "Dengar",
  },
  es: {
    welcome: "¡La aventura llama! ¿Listo para aprender?",
    enterName: "Ingresa tu nombre:",
    imAKid: "Soy un Niño",
    imAParent: "Soy Padre",
    hello: "Hola",
    points: "puntos de aventura!",
    recentAdventures: "Tus Aventuras Recientes",
    exploreGlobe: "Explorar el Globo",
    pickPlace: "¡Elige un lugar en el mapa!",
    createCustom: "Crear Aventura Personalizada",
    whereToTravel: "¿A dónde quieres viajar?",
    generate: "Generar Aventura",
    magicLoading: "Cargando Magia...",
    next: "Siguiente",
    back: "Atrás",
    startQuiz: "Empezar Cuestionario",
    finish: "Terminar Aventura",
    pointsEarned: "Ganaste",
    returnMap: "Volver al Mapa",
    language: "Idioma",
    parentDash: "Panel de Padres",
    storiesCompleted: "Historias Completadas",
    explorerRank: "Rango de Explorador",
    signOut: "Cerrar Sesión",
    listen: "Escuchar",
  },
};

const getTranslation = (langCode: string, key: string) => {
  const dict = UI_STRINGS[langCode] || UI_STRINGS['en'];
  return dict[key] || UI_STRINGS['en'][key] || key;
};

// Mock Initial Data
const INITIAL_ADVENTURES: Adventure[] = [
  {
    id: '1',
    title: 'The Great Pyramid Mystery',
    location: 'Giza, Egypt',
    era: 'Ancient Egypt',
    summary: 'Join young scribe Kheti as he discovers how the giant stones were moved!',
    sections: [
      { id: 's1', text: 'Kheti stood before the rising Great Pyramid. It was taller than anything he had ever seen! Thousands of workers were moving massive stones under the hot sun.', imageUrl: 'https://picsum.photos/seed/egypt1/800/450' },
      { id: 's2', text: 'Using wet sand and heavy ropes, they dragged the limestone across the desert. Kheti marveled at the math and engineering his people used.', imageUrl: 'https://picsum.photos/seed/egypt2/800/450' }
    ],
    quiz: [
      { id: 'q1', question: 'What did they put on the sand to help drag stones?', options: ['Water', 'Oil', 'Honey', 'Ice'], correctAnswer: 0 }
    ],
    coverImage: 'https://picsum.photos/seed/pyramid/400/250'
  }
];

const App: React.FC = () => {
  const [view, setView] = useState<'welcome' | 'explorer' | 'reader' | 'parent' | 'creating' | 'globe'>('welcome');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [adventures, setAdventures] = useState<Adventure[]>(INITIAL_ADVENTURES);
  const [activeAdventure, setActiveAdventure] = useState<Adventure | null>(null);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const t = (key: string) => getTranslation(user?.language || 'en', key);

  useEffect(() => {
    const savedUser = localStorage.getItem('storygeo_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogin = (name: string, type: 'child' | 'parent') => {
    const newUser: UserProfile = {
      id: Math.random().toString(),
      name,
      type,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      completedAdventures: [],
      totalScore: 0,
      lastLogin: new Date().toISOString(),
      language: 'en'
    };
    setUser(newUser);
    localStorage.setItem('storygeo_user', JSON.stringify(newUser));
    setView(type === 'child' ? 'explorer' : 'parent');
  };

  const setLanguage = (langCode: string) => {
    if (user) {
      const updatedUser = { ...user, language: langCode };
      setUser(updatedUser);
      localStorage.setItem('storygeo_user', JSON.stringify(updatedUser));
    }
    setShowLanguageModal(false);
  };

  const startAdventure = (adv: Adventure) => {
    setActiveAdventure(adv);
    setActiveSectionIdx(0);
    setShowQuiz(false);
    setView('reader');
  };

  const handleCreateAdventure = async (predefinedTopic?: string) => {
    const topic = predefinedTopic || newTopic;
    if (!topic) return;
    setIsGenerating(true);
    setView('creating');
    try {
      const selectedLanguage = LANGUAGES.find(l => l.code === (user?.language || 'en'))?.name || 'English';
      const newAdv = await generateAdventure(topic, selectedLanguage);
      const cover = await generateStoryImage(`${newAdv.title} ${newAdv.location}`);
      newAdv.coverImage = cover;
      
      for (let i = 0; i < newAdv.sections.length; i++) {
        newAdv.sections[i].imageUrl = await generateStoryImage(newAdv.sections[i].text.substring(0, 100));
      }

      setAdventures([newAdv, ...adventures]);
      setIsGenerating(false);
      setView('explorer');
      setNewTopic('');
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  const handleReadContent = async () => {
    if (!activeAdventure || isSpeaking) return;
    
    setIsSpeaking(true);
    const text = activeAdventure.sections[activeSectionIdx].text;
    
    try {
      const base64Audio = await generateSpeech(text);
      if (!base64Audio) {
        setIsSpeaking(false);
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      const audioData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
      
      if (currentSourceRef.current) {
        currentSourceRef.current.stop();
      }
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(false);
      currentSourceRef.current = source;
      source.start();
    } catch (error) {
      console.error("Audio playback error:", error);
      setIsSpeaking(false);
    }
  };

  const handleQuizFinish = (score: number) => {
    if (user && activeAdventure) {
      const updatedUser = {
        ...user,
        totalScore: user.totalScore + score,
        completedAdventures: [...new Set([...user.completedAdventures, activeAdventure.id])]
      };
      setUser(updatedUser);
      localStorage.setItem('storygeo_user', JSON.stringify(updatedUser));
    }
    setView('explorer');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border-4 border-blue-200">
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-yellow-100 rounded-full">
              <Map className="w-16 h-16 text-yellow-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2">StoryGeo</h1>
          <p className="text-gray-600 mb-8 italic">{getTranslation('en', 'welcome')}</p>
          <div className="space-y-4">
            <div className="text-left">
              <label className="block text-sm font-semibold text-gray-700 ml-1 mb-1">{getTranslation('en', 'enterName')}</label>
              <input id="login-name" type="text" className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-blue-400 outline-none transition-all" placeholder="Explorer Sam" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleLogin((document.getElementById('login-name') as HTMLInputElement).value || 'Explorer', 'child')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex flex-col items-center gap-2">
                <User /> {getTranslation('en', 'imAKid')}
              </button>
              <button onClick={() => handleLogin((document.getElementById('login-name') as HTMLInputElement).value || 'Parent', 'parent')} className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex flex-col items-center gap-2">
                <Settings /> {getTranslation('en', 'imAParent')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-20 bg-blue-50">
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 md:h-full md:w-20 md:flex-col md:border-r md:border-t-0 flex items-center justify-around md:justify-center md:gap-10 py-4 z-50">
        <button onClick={() => setView('explorer')} className={`p-3 rounded-2xl transition-all ${view === 'explorer' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}>
          <Home className="w-7 h-7" />
        </button>
        <button onClick={() => setView('globe')} className={`p-3 rounded-2xl transition-all ${view === 'globe' ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-500'}`}>
          <GlobeIcon className="w-7 h-7" />
        </button>
        <button onClick={() => setView('creating')} className={`p-3 rounded-2xl transition-all ${view === 'creating' ? 'bg-yellow-100 text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}>
          <PlusCircle className="w-7 h-7" />
        </button>
        <button onClick={() => setShowLanguageModal(true)} className={`p-3 rounded-2xl transition-all text-gray-400 hover:text-orange-500`}>
          <Languages className="w-7 h-7" />
        </button>
        <button onClick={() => setView('parent')} className={`p-3 rounded-2xl transition-all ${view === 'parent' ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-purple-500'}`}>
          <BarChart2 className="w-7 h-7" />
        </button>
        <div className="hidden md:flex flex-col items-center mt-auto mb-4">
           <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-blue-400" alt="Profile" />
        </div>
      </nav>

      <main className="p-6 md:p-10 max-w-6xl mx-auto">
        {view === 'explorer' && (
          <div>
            <header className="mb-8 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-blue-900">{t('hello')}, {user.name}!</h2>
                <p className="text-blue-600 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  {user.totalScore} {t('points')}
                </p>
              </div>
              <button onClick={() => setShowLanguageModal(true)} className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm text-sm font-bold text-gray-600 hover:bg-gray-50">
                 {LANGUAGES.find(l => l.code === user.language)?.flag} {LANGUAGES.find(l => l.code === user.language)?.native}
              </button>
            </header>

            <h3 className="text-xl font-bold text-gray-800 mb-6">{t('recentAdventures')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {adventures.map((adv) => (
                <div key={adv.id} onClick={() => startAdventure(adv)} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group transform hover:-translate-y-2 border border-gray-100">
                  <div className="relative h-48 overflow-hidden">
                    <img src={adv.coverImage || `https://picsum.photos/seed/${adv.id}/400/250`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={adv.title} />
                    {user.completedAdventures.includes(adv.id) && (
                      <div className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded-full shadow-lg">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4">
                       <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-blue-700 uppercase tracking-wider">{adv.location}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h4 className="text-xl font-bold text-blue-900 mb-2 group-hover:text-blue-600">{adv.title}</h4>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{adv.summary}</p>
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-blue-400">{adv.era}</span>
                       <ChevronRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
              <div onClick={() => setView('globe')} className="bg-blue-100/50 border-4 border-dashed border-blue-200 rounded-3xl flex flex-col items-center justify-center p-8 text-center hover:bg-blue-100 transition-all cursor-pointer group">
                <div className="p-4 bg-blue-500 text-white rounded-full mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <GlobeIcon className="w-10 h-10" />
                </div>
                <h4 className="text-xl font-bold text-blue-900">{t('exploreGlobe')}</h4>
                <p className="text-blue-600 text-sm">{t('pickPlace')}</p>
              </div>
            </div>
          </div>
        )}

        {view === 'globe' && (
          <div className="max-w-4xl mx-auto">
            <header className="mb-10 text-center">
              <h2 className="text-4xl font-bold text-blue-900 mb-3 flex items-center justify-center gap-3">
                <GlobeIcon className="text-green-500 w-10 h-10" />
                {t('exploreGlobe')}
              </h2>
              <p className="text-xl text-blue-600">{t('pickPlace')}</p>
            </header>
            <GlobeSelector onSelect={(location) => handleCreateAdventure(location)} />
          </div>
        )}

        {view === 'creating' && (
          <div className="max-w-2xl mx-auto py-12">
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border-t-8 border-yellow-400">
              <h2 className="text-3xl font-bold text-blue-900 mb-2">{t('createCustom')}</h2>
              <p className="text-gray-600 mb-8">{t('whereToTravel')}</p>
              <div className="space-y-6">
                <input type="text" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Amazon, Vikings..." className="w-full px-6 py-4 text-xl rounded-2xl border-4 border-gray-50 focus:border-yellow-300 outline-none transition-all" />
                <button onClick={() => handleCreateAdventure()} disabled={isGenerating || !newTopic} className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-200 text-blue-900 font-bold text-xl py-6 rounded-3xl shadow-lg transition-all flex items-center justify-center gap-3">
                  {isGenerating ? <><div className="w-6 h-6 border-4 border-blue-900/30 border-t-blue-900 rounded-full animate-spin"></div> {t('magicLoading')}</> : <><PlusCircle /> {t('generate')}</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'reader' && activeAdventure && (
          <div className="max-w-4xl mx-auto">
            {!showQuiz ? (
              <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
                <div className="h-[400px] w-full relative">
                  <img src={activeAdventure.sections[activeSectionIdx].imageUrl} className="w-full h-full object-cover" alt="Story scene" />
                  <div className="absolute top-6 left-6 flex items-center gap-3">
                    <button onClick={() => setView('explorer')} className="bg-white/90 backdrop-blur p-3 rounded-full shadow-lg hover:bg-white transition-all">
                       <ArrowLeft className="w-6 h-6 text-blue-900" />
                    </button>
                    <button 
                      onClick={handleReadContent} 
                      disabled={isSpeaking}
                      className={`bg-white/90 backdrop-blur px-6 py-3 rounded-full shadow-lg flex items-center gap-3 transition-all ${isSpeaking ? 'text-blue-400' : 'text-blue-900 hover:bg-blue-50'}`}
                    >
                       {isSpeaking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                       <span className="font-bold">{t('listen')}</span>
                    </button>
                  </div>
                </div>
                <div className="p-10">
                  <p className="text-2xl text-gray-800 leading-relaxed font-medium mb-10">{activeAdventure.sections[activeSectionIdx].text}</p>
                  <div className="flex justify-between items-center">
                    <button disabled={activeSectionIdx === 0} onClick={() => setActiveSectionIdx(idx => idx - 1)} className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold bg-gray-100 text-gray-500 disabled:opacity-30">
                      <ArrowLeft /> {t('back')}
                    </button>
                    {activeSectionIdx < activeAdventure.sections.length - 1 ? (
                      <button onClick={() => setActiveSectionIdx(idx => idx + 1)} className="flex items-center gap-2 px-10 py-4 rounded-2xl font-bold bg-blue-500 text-white shadow-lg">
                        {t('next')} <ArrowRight />
                      </button>
                    ) : (
                      <button onClick={() => setShowQuiz(true)} className="flex items-center gap-2 px-10 py-4 rounded-2xl font-bold bg-green-500 text-white shadow-lg">
                        {t('startQuiz')} <Trophy />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <QuizModule t={t} quiz={activeAdventure.quiz} onFinish={handleQuizFinish} />
            )}
          </div>
        )}

        {view === 'parent' && (
          <div className="space-y-8">
            <header className="flex justify-between items-end">
              <h2 className="text-3xl font-bold text-purple-900">{t('parentDash')}</h2>
              <button onClick={() => { localStorage.removeItem('storygeo_user'); setUser(null); setView('welcome'); }} className="text-red-500 font-bold hover:underline">{t('signOut')}</button>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-3xl shadow-sm text-center">
                <BookOpen className="w-8 h-8 text-blue-500 mx-auto mb-4" />
                <h4 className="text-3xl font-bold text-blue-900">{user.completedAdventures.length}</h4>
                <p className="text-gray-500">{t('storiesCompleted')}</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm text-center">
                <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-4" />
                <h4 className="text-3xl font-bold text-yellow-900">{user.totalScore}</h4>
                <p className="text-gray-500">{t('points')}</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm text-center">
                <Settings className="w-8 h-8 text-green-500 mx-auto mb-4" />
                <h4 className="text-3xl font-bold text-green-900">Level 4</h4>
                <p className="text-gray-500">{t('explorerRank')}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-[100] bg-blue-900/40 backdrop-blur-sm flex items-center justify-center p-6">
           <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full p-10 relative border-4 border-orange-200">
              <button onClick={() => setShowLanguageModal(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                <X />
              </button>
              <h2 className="text-3xl font-bold text-blue-900 mb-8 flex items-center gap-3">
                 <Languages className="text-orange-500" />
                 {t('language')}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                 {LANGUAGES.map(lang => (
                   <button 
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${user.language === lang.code ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-orange-200'}`}
                   >
                     <span className="text-2xl">{lang.flag}</span>
                     <div>
                       <p className="font-bold text-blue-900 leading-none">{lang.native}</p>
                       <p className="text-xs text-gray-500 mt-1">{lang.name}</p>
                     </div>
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const GlobeSelector: React.FC<{ onSelect: (location: string) => void }> = ({ onSelect }) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const regions = [
    { id: 'north-america', name: 'North America', color: 'fill-blue-400', hover: 'fill-blue-500', path: 'M180 80 L220 70 L260 100 L240 180 L180 180 L150 140 Z' },
    { id: 'south-america', name: 'South America', color: 'fill-green-400', hover: 'fill-green-500', path: 'M250 200 L300 220 L280 320 L240 300 L230 240 Z' },
    { id: 'europe', name: 'Europe', color: 'fill-yellow-400', hover: 'fill-yellow-500', path: 'M400 80 L460 70 L480 120 L440 130 L410 110 Z' },
    { id: 'africa', name: 'Africa', color: 'fill-orange-400', hover: 'fill-orange-500', path: 'M410 140 L480 150 L520 220 L480 300 L420 280 L390 200 Z' },
    { id: 'asia', name: 'Asia', color: 'fill-red-400', hover: 'fill-red-500', path: 'M480 60 L650 60 L750 140 L700 240 L550 220 L500 130 Z' },
    { id: 'australia', name: 'Australia', color: 'fill-purple-400', hover: 'fill-purple-500', path: 'M650 260 L720 270 L730 320 L660 330 Z' },
  ];

  return (
    <div className="relative bg-white p-8 rounded-[3rem] shadow-xl border-4 border-blue-100 aspect-video flex flex-col items-center justify-center overflow-hidden">
      <svg viewBox="0 0 800 400" className="w-full h-full drop-shadow-2xl">
        <circle cx="400" cy="200" r="190" className="fill-blue-50/50 stroke-blue-200 stroke-2" />
        {regions.map((region) => (
          <path key={region.id} d={region.path} className={`cursor-pointer transition-all duration-300 ${hoveredRegion === region.id ? region.hover : region.color} stroke-white stroke-2`} onMouseEnter={() => setHoveredRegion(region.id)} onMouseLeave={() => setHoveredRegion(null)} onClick={() => onSelect(region.name)} />
        ))}
        {hoveredRegion && <text x="400" y="350" textAnchor="middle" className="text-2xl font-bold fill-blue-900 pointer-events-none">{regions.find(r => r.id === hoveredRegion)?.name}</text>}
      </svg>
    </div>
  );
};

const QuizModule: React.FC<{ quiz: Adventure['quiz'], onFinish: (score: number) => void, t: any }> = ({ quiz, onFinish, t }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const handleNext = () => {
    if (selected === quiz[currentIdx].correctAnswer) setScore(s => s + 10);
    if (currentIdx < quiz.length - 1) { setCurrentIdx(idx => idx + 1); setSelected(null); }
    else setIsDone(true);
  };

  if (isDone) {
    return (
      <div className="bg-white p-12 rounded-[3rem] shadow-xl text-center border-t-8 border-green-500">
        <Trophy className="w-16 h-16 text-green-600 mx-auto mb-6" />
        <h2 className="text-4xl font-bold text-blue-900 mb-2">{t('finish')}!</h2>
        <p className="text-xl text-gray-600 mb-10">{t('pointsEarned')} <span className="text-green-600 font-bold">{score}</span> {t('points')}</p>
        <button onClick={() => onFinish(score)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-12 py-5 rounded-3xl shadow-lg">{t('returnMap')}</button>
      </div>
    );
  }

  return (
    <div className="bg-white p-10 rounded-[3rem] shadow-xl">
      <h3 className="text-3xl font-bold text-blue-900 mb-10">{quiz[currentIdx].question}</h3>
      <div className="space-y-4 mb-10">
        {quiz[currentIdx].options.map((opt, i) => (
          <button key={i} onClick={() => setSelected(i)} className={`w-full text-left p-6 rounded-2xl border-2 font-bold ${selected === i ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-600'}`}>{opt}</button>
        ))}
      </div>
      <button disabled={selected === null} onClick={handleNext} className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 text-white font-bold py-6 rounded-3xl shadow-lg">
        {currentIdx === quiz.length - 1 ? t('finish') : t('next')}
      </button>
    </div>
  );
}

export default App;
