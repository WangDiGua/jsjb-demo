import { changeConfirmLocale } from 'antd/es/modal/locale';
import { appAntdLocale } from '@/antdAppLocale';

/**
 * `Modal.confirm` 等静态方法在独立 React 树里拿不到 `ConfigProvider` 的 locale，
 * 且运行时默认文案为 en_US。`LocaleProvider` 里虽会 `useEffect` 注册中文，但首帧仍可能为英文。
 * 启动时同步注册，保证弹窗按钮为「确定 / 取消」。
 */
changeConfirmLocale(appAntdLocale.Modal);
