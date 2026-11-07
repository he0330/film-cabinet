'use client';

import {
  type ComponentType,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas } from '@react-three/fiber';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  ImagePlus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

export type FilmModelProps = {
  filmId: string;
  filmColor: string;
  modelType: string;
};

export type Interface2Props = FilmModelProps & {
  /** 用于页面标题；不传时自动由 modelType / filmId 生成。 */
  filmName?: string;
  /** 返回界面 1（柜子列表）的回调。 */
  onBack?: () => void;
  /**
   * 把界面 1 中复用的真实胶卷 R3F 模型传进来即可替换默认占位模型。
   * 例：filmModel={CabinetFilmRollModel}
   */
  FilmModel?: ComponentType<FilmModelProps>;
  /** 可选：接入 html-to-image、服务端导出等真实下载逻辑。 */
  onDownload?: (payload: {
    filmId: string;
    filmColor: string;
    modelType: string;
    imageUrls: string[];
  }) => void;
};

type LocalImage = {
  id: string;
  name: string;
  url: string;
};

const FRAME_COUNT = 3;

/**
 * 给使用 Next.js App Router 的页面解析柜子页传参。
 * const query = useSearchParams();
 * <Interface2 {...filmPropsFromSearchParams(query)} />
 */
export function filmPropsFromSearchParams(params: Pick<URLSearchParams, 'get'>): FilmModelProps {
  return {
    filmId: params.get('filmId') ?? 'kodak-vision3-50d',
    filmColor: params.get('filmColor') ?? '#e7b51b',
    modelType: params.get('modelType') ?? '35mm-canister',
  };
}

/** 临时 3D 胶卷；接入柜子页模型后会由 props.FilmModel 自动替换。 */
function FallbackFilmModel({ filmColor }: FilmModelProps) {
  return (
    <group rotation={[0.12, -0.36, 0]}>
      <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.92, 0.92, 2.8, 48]} />
        <meshStandardMaterial color="#171717" roughness={0.42} metalness={0.38} />
      </mesh>
      <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.95, 0.95, 1.7, 48, 1, true, Math.PI, Math.PI]} />
        <meshStandardMaterial color={filmColor} roughness={0.5} metalness={0.08} />
      </mesh>
      <mesh castShadow receiveShadow position={[-1.47, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.99, 0.99, 0.16, 48]} />
        <meshStandardMaterial color="#b5b1aa" roughness={0.23} metalness={0.9} />
      </mesh>
      <mesh castShadow receiveShadow position={[1.47, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.99, 0.99, 0.16, 48]} />
        <meshStandardMaterial color="#b5b1aa" roughness={0.23} metalness={0.9} />
      </mesh>
    </group>
  );
}

function SprocketRail({ side }: { side: 'left' | 'right' }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 ${side === 'left' ? 'left-0' : 'right-0'} w-[10%] opacity-90`}
      style={{
        backgroundImage:
          'repeating-linear-gradient(to bottom, transparent 0 11px, #e8e2d5 11px 20px, transparent 20px 34px)',
      }}
    />
  );
}

type FilmFrameProps = {
  index: number;
  image?: LocalImage;
  active: boolean;
  onSelect: () => void;
  onDropImage: (imageId: string) => void;
};

function FilmFrame({ index, image, active, onSelect, onDropImage }: FilmFrameProps) {
  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const imageId = event.dataTransfer.getData('application/x-film-image');
    if (imageId) onDropImage(imageId);
  };

  return (
    <button
      type="button"
      aria-label={`第 ${index + 1} 格胶片${image ? '，已有图片' : '，空白'}`}
      onClick={onSelect}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className={`relative mx-auto block aspect-[1.1/1] w-[min(100%,19rem)] overflow-hidden border bg-[#11100f] p-[7%_11%] text-left transition ${
        active ? 'border-[#eba33a] shadow-[0_0_0_2px_rgba(235,163,58,.25)]' : 'border-[#3e352a] hover:border-[#b7772e]'
      }`}
    >
      <SprocketRail side="left" />
      <SprocketRail side="right" />
      <span className="absolute left-[12%] right-[12%] top-1 text-center font-mono text-[8px] tracking-[0.24em] text-[#d88932]">
        VISION3 50D · {String(index * 12 + 1).padStart(2, '0')}
      </span>
      <span className="block h-full overflow-hidden border border-[#6d573d] bg-[#272019]">
        {image ? (
          <img src={image.url} alt={image.name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_center,_#3a3027,_#191614_72%)] font-mono text-[10px] tracking-[0.2em] text-[#806b53]">
            <ImagePlus size={18} strokeWidth={1.25} />
            DROP FRAME
          </span>
        )}
      </span>
      <span className="absolute bottom-1 left-[12%] font-mono text-[8px] tracking-[0.16em] text-[#d88932]">KODAK 35MM</span>
      <span className="absolute bottom-1 right-[12%] font-mono text-[8px] text-[#d88932]">{String(index + 1).padStart(2, '0')}A</span>
    </button>
  );
}

export default function Interface2({
  filmId,
  filmColor,
  modelType,
  filmName,
  onBack,
  FilmModel = FallbackFilmModel,
  onDownload,
}: Interface2Props) {
  const [images, setImages] = useState<LocalImage[]>([]);
  const [frameIds, setFrameIds] = useState<Array<string | null>>(() => Array(FRAME_COUNT).fill(null));
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef(new Set<string>());
  const title = filmName ?? (modelType.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || filmId);

  useEffect(() => () => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const accepted = files.filter((file) => file.type.startsWith('image/'));
    if (!accepted.length) return;
    const newImages = accepted.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrls.current.add(url);
      return { id: crypto.randomUUID(), name: file.name, url };
    });
    setImages((current) => [...current, ...newImages]);
  }, []);

  const placeImage = useCallback((imageId: string, destination = selectedFrame) => {
    setFrameIds((current) => {
      const firstEmpty = current.findIndex((id) => !id);
      const slot = current[destination] ? destination : firstEmpty >= 0 ? firstEmpty : destination;
      const next = [...current];
      next[slot] = imageId;
      setSelectedFrame(Math.min(slot + 1, FRAME_COUNT - 1));
      return next;
    });
  }, [selectedFrame]);

  const removeImage = (image: LocalImage) => {
    URL.revokeObjectURL(image.url);
    objectUrls.current.delete(image.url);
    setImages((current) => current.filter(({ id }) => id !== image.id));
    setFrameIds((current) => current.map((id) => (id === image.id ? null : id)));
  };

  const clearImages = () => {
    images.forEach((image) => {
      URL.revokeObjectURL(image.url);
      objectUrls.current.delete(image.url);
    });
    setImages([]);
    setFrameIds(Array(FRAME_COUNT).fill(null));
    setSelectedFrame(0);
  };

  const exportFilm = () => {
    const imageUrls = frameIds.flatMap((id) => images.find((image) => image.id === id)?.url ?? []);
    if (onDownload) {
      onDownload({ filmId, filmColor, modelType, imageUrls });
      return;
    }
    // 默认使用浏览器“另存为 PDF”，实际导出 PNG 可在 onDownload 中接 html-to-image。
    window.print();
  };

  const frames = useMemo(
    () => frameIds.map((id) => (id ? images.find((image) => image.id === id) : undefined)),
    [frameIds, images],
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0b0b0a] text-[#f5efe4] selection:bg-[#d88932] selection:text-[#16120d]">
      <div className="mx-auto grid min-h-screen max-w-[1720px] lg:grid-cols-[minmax(0,1.18fr)_minmax(24rem,.82fr)]">
        <section className="relative min-h-[58rem] overflow-hidden border-b border-[#30271e] bg-[radial-gradient(circle_at_42%_10%,#302419_0%,#16120f_40%,#090908_78%)] px-5 pb-16 pt-5 sm:px-9 lg:border-b-0 lg:border-r lg:px-12">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.28em] text-[#b9a58c]">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-2 transition hover:text-[#f1b452]">
              <ArrowLeft size={15} /> Cabinet
            </button>
            <span>Roll / {filmId}</span>
          </div>

          <div className="pointer-events-none absolute left-[8%] top-20 h-72 w-72 rounded-full bg-[#c97825]/10 blur-3xl" />
          <header className="relative mt-12 text-center">
            <p className="font-mono text-[10px] tracking-[0.34em] text-[#ca8737]">ARCHIVE YOUR MOMENTS</p>
            <h1 className="mt-3 font-serif text-3xl tracking-[0.06em] text-[#f6eee0] sm:text-5xl">{title}</h1>
            <p className="mt-3 font-mono text-[10px] tracking-[0.18em] text-[#9d8b76]">{filmColor.toUpperCase()} · {modelType.toUpperCase()}</p>
          </header>

          <div className="relative mx-auto mt-8 h-48 w-full max-w-xl sm:h-56">
            <Canvas shadows camera={{ position: [0, 0.2, 5.5], fov: 38 }} dpr={[1, 2]}>
              <ambientLight intensity={1.4} />
              <directionalLight castShadow position={[3, 4, 4]} intensity={2.7} shadow-mapSize={[1024, 1024]} />
              <directionalLight position={[-4, 1, 2]} intensity={0.9} color="#d89944" />
              <FilmModel filmId={filmId} filmColor={filmColor} modelType={modelType} />
            </Canvas>
            <div className="pointer-events-none absolute inset-x-8 bottom-3 h-5 rounded-[100%] bg-black/50 blur-xl" />
          </div>

          <motion.div
            initial={{ y: -90, opacity: 0.15, rotate: -1.5 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 92, damping: 14, mass: 0.9, delay: 0.15 }}
            className="relative mx-auto mt-[-18px] flex w-full max-w-sm flex-col gap-5 pb-7 before:absolute before:inset-x-10 before:-top-12 before:h-20 before:bg-[radial-gradient(ellipse_at_center,_rgba(32,25,18,.95),_transparent_68%)]"
          >
            {frames.map((image, index) => (
              <FilmFrame
                key={index}
                index={index}
                image={image}
                active={selectedFrame === index}
                onSelect={() => setSelectedFrame(index)}
                onDropImage={(id) => placeImage(id, index)}
              />
            ))}
          </motion.div>
        </section>

        <aside className="bg-[#11100f] px-5 py-8 sm:px-9 lg:px-10 lg:py-12">
          <div className="mx-auto max-w-xl">
            <p className="font-mono text-[10px] tracking-[0.28em] text-[#c7853b]">YOUR CONTACT SHEET</p>
            <h2 className="mt-3 font-serif text-3xl text-[#f6eee0]">装入这一卷胶片</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#a79a89]">上传照片后，点击缩略图即可按顺序放入胶片；也可以拖动缩略图至左侧任意一格。</p>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => {
                addFiles(Array.from(event.target.files ?? []));
                event.currentTarget.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDraggingFiles(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDraggingFiles(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingFiles(false);
                addFiles(Array.from(event.dataTransfer.files));
              }}
              className={`mt-9 flex min-h-52 w-full flex-col items-center justify-center rounded-2xl border border-dashed px-6 transition ${
                isDraggingFiles ? 'border-[#f1a238] bg-[#e58c24]/10' : 'border-[#67533a] bg-[#1a1713] hover:border-[#c27c2e] hover:bg-[#211c16]'
              }`}
            >
              <span className="grid h-12 w-12 place-items-center rounded-full border border-[#8a663c] bg-[#252019] text-[#e5a44c]"><Upload size={21} /></span>
              <span className="mt-4 text-sm text-[#eee5d7]">点击或拖拽上传图片</span>
              <span className="mt-2 font-mono text-[10px] tracking-[0.18em] text-[#8e7d69]">JPG · PNG · WEBP · MULTIPLE</span>
            </button>

            <div className="mt-9 flex items-end justify-between border-b border-[#332a21] pb-3">
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-[#c7853b]">NEGATIVES</p>
                <p className="mt-1 text-sm text-[#b3a390]">{images.length} 张可用图片</p>
              </div>
              {images.length > 0 && (
                <button type="button" onClick={clearImages} className="inline-flex items-center gap-1.5 text-xs text-[#a99279] transition hover:text-[#e7a74c]">
                  <Trash2 size={14} /> 清空
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((image) => (
                <div key={image.id} className="group relative aspect-square overflow-hidden rounded-lg border border-[#443729] bg-[#211b15]">
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('application/x-film-image', image.id)}
                    onClick={() => placeImage(image.id)}
                    className="h-full w-full cursor-grab active:cursor-grabbing"
                    title="点击填入当前胶片格，或拖入左侧胶片"
                  >
                    <img src={image.url} alt={image.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(image)}
                    aria-label={`移除 ${image.name}`}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/65 text-white opacity-0 transition hover:bg-[#b94e35] group-hover:opacity-100 focus:opacity-100"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button type="button" onClick={() => { setFrameIds(Array(FRAME_COUNT).fill(null)); setSelectedFrame(0); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#66513a] px-4 py-3 text-xs text-[#d6c4ac] transition hover:border-[#d18a37] hover:text-[#f0b75d]">
                <RotateCcw size={15} /> 重置格子
              </button>
              <button type="button" onClick={clearImages} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#66513a] px-4 py-3 text-xs text-[#d6c4ac] transition hover:border-[#d18a37] hover:text-[#f0b75d]">
                <Trash2 size={15} /> 清空图片
              </button>
              <button type="button" onClick={exportFilm} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e2a046] bg-[#cf812d] px-4 py-3 text-xs font-semibold text-[#1a120b] transition hover:bg-[#eba143]">
                <Download size={15} /> 下载胶卷
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
