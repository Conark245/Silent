with open('src/types.ts', 'r') as f:
    content = f.read()

system_settings_old = """export interface SystemSettings {
  defaultSoundId?: string;
}"""

system_settings_new = """export interface SystemSettings {
  defaultSoundId?: string;
  themeConfig?: {
    fontFamily: string;
    backgroundColor: string;
    animationSpeed: number; // e.g. 1 (normal), 0.5 (slow), 2 (fast)
  };
}"""

content = content.replace(system_settings_old, system_settings_new)

with open('src/types.ts', 'w') as f:
    f.write(content)
