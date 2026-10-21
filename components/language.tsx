"use client";
import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { translate, type Language } from "@/lib/i18n";
import { displayDemoText } from "@/lib/demo-ru";

const Context = createContext<{ language: Language; setLanguage: (language: Language) => void }>({ language: "en", setLanguage: () => {} });
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, update] = useState<Language>("en");
  useEffect(() => { try { const stored = localStorage.getItem("fairdeal-language"); if (stored === "ru" || stored === "en") update(stored); } catch {} }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = (next: Language) => { update(next); try { localStorage.setItem("fairdeal-language", next); } catch {} };
  return <Context.Provider value={{ language, setLanguage }}>{children}</Context.Provider>;
}
export const useLanguage = () => useContext(Context);

function localize(node: ReactNode, language: Language): ReactNode {
  return Children.map(node, child => {
    if (typeof child === "string") return translate(child, language);
    if (!isValidElement<Record<string, unknown>>(child)) return child;
    const props = child.props;
    if (props["data-localize"] === "off") return child;
    const patch: Record<string, unknown> = {};
    for (const name of ["title", "subtitle", "label", "note", "placeholder", "aria-label"]) if (typeof props[name] === "string") patch[name] = translate(props[name], language);
    if (props.children !== undefined) patch.children = localize(props.children as ReactNode, language);
    // Field values are handled by their owning forms. Never mutate saved data.
    return cloneElement(child, patch);
  });
}
export function Localized({ children }: { children: ReactNode }) { const { language } = useLanguage(); return <>{localize(children, language)}</>; }
export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return <div className="language-switch" role="group" aria-label="Language / Язык"><button type="button" lang="en" aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button><button type="button" lang="ru" aria-label="Русский" aria-pressed={language === "ru"} onClick={() => setLanguage("ru")}>RU</button></div>;
}

export function StatementField({ id, name, initialValue }: { id: string; name: string; initialValue: string }) {
  const { language } = useLanguage();
  const [value, setValue] = useState(() => displayDemoText(initialValue, language));
  const previousLanguage = useRef(language);
  useEffect(() => {
    if (previousLanguage.current !== language) {
      setValue(current => displayDemoText(current, language));
      previousLanguage.current = language;
    }
  }, [language]);
  return <textarea id={id} name={name} rows={4} required minLength={10} maxLength={4000} value={value} onChange={e => setValue(e.target.value)} />;
}
