-- MICEGO 0011: 초대 상태 enum 값 추가 (대리 입력 흐름). alter type ... add value 는 단독 파일에서.  - 클로드
alter type public.invitation_status add value if not exists 'proxy_entered';
alter type public.invitation_status add value if not exists 'hotel_confirmed';
alter type public.invitation_status add value if not exists 'proxy_disputed';
alter type public.invitation_status add value if not exists 'proxy_expired';
