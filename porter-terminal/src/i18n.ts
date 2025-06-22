import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async () => {
  // Since we're not using i18n routing, we'll manage the locale via cookies/context
  const locale = 'en'; // Default locale, will be managed by context

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
}); 