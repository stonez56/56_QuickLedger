import React, { useRef, useState, useEffect } from 'react';
import { Camera, Loader2, Sparkles, X, ScanLine, Upload } from 'lucide-react';
import { FLATTENED_CATEGORY_VALUES, AI_SCANNER_PROMPT } from '../constants.ts';

interface ScannerProps {
  onScanResult: (data: any) => void;
  onClose: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanResult, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraError(null);
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 } 
        } 
      });
      
      setCameraActive(true);
      
      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
             await videoRef.current.play();
          } catch (e) {
             console.error("Video play error:", e);
          }
        }
      }, 100);

    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("無法存取相機，請檢查瀏覽器權限或使用 HTTPS。");
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      stopCamera();
      processImage(base64Data);
    }
  };

  const processImage = async (base64Data: string) => {
    setLoading(true);
    try {
      const categoryList = FLATTENED_CATEGORY_VALUES.join('", "');
      const fullPrompt = AI_SCANNER_PROMPT.replace('{{CATEGORY_LIST}}', `["${categoryList}"]`);

      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Data,
          promptText: fullPrompt
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const result = await response.json();
      console.log("AI Scan Result:", result);
      onScanResult(result);

    } catch (error) {
      console.error("AI Scan Error:", error);
      alert(`掃描辨識失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("圖片過大，請使用小於 5MB 的照片");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <canvas ref={canvasRef} className="hidden" />

          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 via-purple-500 to-emerald-500" />
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center text-white">
              <ScanLine className="w-5 h-5 mr-2 text-sky-400" />
              AI 智慧憑證掃描
            </h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
               <div className="w-full h-48 rounded-xl border-2 border-dashed border-sky-500/50 bg-sky-500/5 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
                  <p className="text-sm text-sky-300 font-medium animate-pulse">正在分析憑證...</p>
               </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                  <button
                      onClick={startCamera}
                      className="flex flex-col items-center justify-center h-32 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-sky-500/50 transition-all group"
                  >
                      <div className="p-3 rounded-full bg-slate-900 group-hover:bg-sky-500 group-hover:text-white text-sky-400 mb-2 transition-colors">
                          <Camera className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-medium text-slate-300">開啟相機</span>
                  </button>

                  <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center h-32 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-emerald-500/50 transition-all group"
                  >
                      <div className="p-3 rounded-full bg-slate-900 group-hover:bg-emerald-500 group-hover:text-white text-emerald-400 mb-2 transition-colors">
                          <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-medium text-slate-300">上傳圖片</span>
                  </button>
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileUpload} 
            />

            {cameraError && (
                <div className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded text-center">
                    {cameraError}
                </div>
            )}

            <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400 leading-relaxed border border-slate-700/50">
              <p className="flex items-start gap-2">
                <Sparkles className="w-3 h-3 mt-0.5 text-yellow-400 shrink-0" />
                AI 將自動辨識：進銷別、日期、統編、金額與科目。
              </p>
            </div>
          </div>
        </div>
      </div>

      {cameraActive && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
          <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pb-12">
             <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-white text-sm font-medium border border-white/10">
                拍攝收據 / 發票
             </div>
             <button 
               onClick={stopCamera} 
               className="p-3 bg-black/40 hover:bg-slate-800 text-white rounded-full backdrop-blur-md transition-all border border-white/10"
             >
               <X size={24} />
             </button>
          </div>

          <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="absolute w-full h-full object-cover"
              />
              <div className="relative w-[85%] aspect-[3/4] max-w-md border-2 border-white/30 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-sky-500 -mt-0.5 -ml-0.5 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-sky-500 -mt-0.5 -mr-0.5 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-sky-500 -mb-0.5 -ml-0.5 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-sky-500 -mb-0.5 -mr-0.5 rounded-br-xl" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                     <ScanLine className="w-16 h-16 text-white animate-pulse" />
                  </div>
              </div>
          </div>
          
          <div className="h-32 bg-black flex items-center justify-center relative z-20 pt-2 pb-8">
               <button 
                  onClick={captureImage}
                  className="group relative w-20 h-20 flex items-center justify-center touch-manipulation"
               >
                   <div className="absolute inset-0 bg-white rounded-full opacity-20 group-hover:scale-110 transition-transform duration-300" />
                   <div className="relative w-16 h-16 bg-white rounded-full border-[3px] border-slate-900 ring-4 ring-white shadow-xl group-active:scale-95 transition-transform duration-100" />
               </button>
          </div>
        </div>
      )}
    </>
  );
};