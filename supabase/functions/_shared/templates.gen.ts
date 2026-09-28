// 이 파일은 생성됩니다. supabase/scripts/sync_templates.py 로 다시 만드세요.
// source: docs/notification-templates.json v1.1 + emails/*.html

export interface TemplateVar { key: string; kr_name: string; description: string; sample: string; maxLen?: number; }
export interface TemplateDef {
  id: string; name: string; recipient: string; mode: string; language: string;
  channels: { email: boolean; alimtalk: boolean; lms: boolean; sms: boolean };
  email?: { subject: string; subject_round2?: string; preheader?: string; cc?: string; optional_blocks: string[] };
  alimtalk?: { code: string; body: string; buttons: { name: string; url: string }[]; fallback_title: string; fallback_body: string };
  sms?: { body: string; limit_bytes: number };
  variables: TemplateVar[];
}

export const TEMPLATES: Record<string, TemplateDef> = {
  "ORG_RECEIVED": {
    "id": "ORG_RECEIVED",
    "name": "접수 확인",
    "recipient": "org",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": true,
      "lms": true,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 견적 요청이 접수되었습니다 · {{RFP_ID}}",
      "preheader": "요청번호 {{RFP_ID}} · {{DESTINATION}} {{EVENT_TYPE}} · 3영업일 안에 진행 상황을 알려 드립니다.",
      "cc": "",
      "optional_blocks": [
        "REGIONAL_PARTNER"
      ]
    },
    "alimtalk": {
      "code": "micego_org_received",
      "body": "[MICEGO] 견적 요청을 접수했습니다.\n\n{{ORG_CONTACT_NAME}}님, 요청이 정상적으로 접수되었습니다. 접수된 영업일에 확인을 시작해 3영업일 안에 진행 상황과 다음 일정을 알려 드립니다.\n\n■ 요청번호: {{RFP_ID}}\n■ 접수일시: {{RECEIVED_AT}}\n■ 행사: {{DESTINATION}} {{EVENT_TYPE}} · {{PAX}}\n\n진행 상황은 아래 버튼에서 언제든 확인하실 수 있습니다. 개인 링크이므로 외부에 전달하지 말아 주세요.\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.",
      "buttons": [
        {
          "name": "진행 상황 보기",
          "url": "https://micego.example/ko/track.html?t={{TRACK_TOKEN}}"
        }
      ],
      "fallback_title": "[MICEGO] 접수 확인",
      "fallback_body": "[MICEGO] 견적 요청을 접수했습니다.\n\n{{ORG_CONTACT_NAME}}님, 요청이 정상적으로 접수되었습니다. 접수된 영업일에 확인을 시작해 3영업일 안에 진행 상황과 다음 일정을 알려 드립니다.\n\n■ 요청번호: {{RFP_ID}}\n■ 접수일시: {{RECEIVED_AT}}\n■ 행사: {{DESTINATION}} {{EVENT_TYPE}} · {{PAX}}\n\n진행 상황은 아래 버튼에서 언제든 확인하실 수 있습니다. 개인 링크이므로 외부에 전달하지 말아 주세요.\n\n▶ 진행 상황: https://micego.example/ko/track.html?t={{TRACK_TOKEN}}\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다."
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "DESTINATION",
        "kr_name": "목적지",
        "description": "행사 목적지",
        "sample": "다낭",
        "maxLen": 20
      },
      {
        "key": "EVENT_TYPE",
        "kr_name": "행사유형",
        "description": "행사 유형",
        "sample": "인센티브",
        "maxLen": 12
      },
      {
        "key": "ORG_CONTACT_NAME",
        "kr_name": "담당자명",
        "description": "오거나이저 담당자 이름·직함",
        "sample": "김지은 과장",
        "maxLen": 20
      },
      {
        "key": "RECEIVED_AT",
        "kr_name": "접수일시",
        "description": "접수 시각 (KST)",
        "sample": "2026-09-26 14:32",
        "maxLen": 16
      },
      {
        "key": "PAX",
        "kr_name": "인원",
        "description": "예상 인원",
        "sample": "150–199명",
        "maxLen": 14
      },
      {
        "key": "PARTNER_PUBLIC_NAME",
        "kr_name": "지역파트너",
        "description": "호텔에 보이는 지역 파트너 이름",
        "sample": "MICEGO Thailand",
        "maxLen": 40
      },
      {
        "key": "TRACK_URL",
        "kr_name": "추적링크",
        "description": "오거나이저 추적 링크 전체 (이메일용)",
        "sample": "https://micego.example/ko/track.html?t=demo-2610",
        "maxLen": 90
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      },
      {
        "key": "TRACK_TOKEN",
        "kr_name": "추적토큰",
        "description": "추적 링크 토큰 (알림톡 버튼·LMS용, URL 끝 변수)",
        "sample": "demo-2610",
        "maxLen": 40
      }
    ]
  },
  "ORG_REJECTED": {
    "id": "ORG_REJECTED",
    "name": "반려 안내",
    "recipient": "org",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": true,
      "lms": true,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 이번 요청은 진행하기 어렵습니다 · {{RFP_ID}}",
      "preheader": "요청번호 {{RFP_ID}} · 사유를 안내드립니다. 조건이 갖춰지면 새로 요청해 주세요.",
      "cc": "",
      "optional_blocks": []
    },
    "alimtalk": {
      "code": "micego_org_rejected",
      "body": "[MICEGO] 이번 요청은 진행하기 어렵습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청을 검토했지만 이번에는 호텔에 요청을 보내지 못했습니다.\n\n■ 사유: {{REJECT_REASON}}\n\n사유가 해결되면 아래 버튼에서 새로 요청해 주세요. 접수하신 내용은 호텔에 전달되지 않았습니다.\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.",
      "buttons": [
        {
          "name": "새로 요청하기",
          "url": "https://micego.example/ko/#register"
        }
      ],
      "fallback_title": "[MICEGO] 요청 반려 안내",
      "fallback_body": "[MICEGO] 이번 요청은 진행하기 어렵습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청을 검토했지만 이번에는 호텔에 요청을 보내지 못했습니다.\n\n■ 사유: {{REJECT_REASON}}\n\n사유가 해결되면 아래 버튼에서 새로 요청해 주세요. 접수하신 내용은 호텔에 전달되지 않았습니다.\n\n▶ 새로 요청하기: https://micego.example/ko/#register\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다."
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "ORG_CONTACT_NAME",
        "kr_name": "담당자명",
        "description": "오거나이저 담당자 이름·직함",
        "sample": "김지은 과장",
        "maxLen": 20
      },
      {
        "key": "RECEIVED_AT",
        "kr_name": "접수일시",
        "description": "접수 시각 (KST)",
        "sample": "2026-09-26 14:32",
        "maxLen": 16
      },
      {
        "key": "DESTINATION",
        "kr_name": "목적지",
        "description": "행사 목적지",
        "sample": "다낭",
        "maxLen": 20
      },
      {
        "key": "REJECT_REASON",
        "kr_name": "반려사유",
        "description": "반려 사유 문장 (고정 3종 중 택1, 아래 표)",
        "sample": "행사 시작일이 확정되지 않아 호텔에 요청을 보내지 못했습니다.",
        "maxLen": 60
      },
      {
        "key": "REGISTER_URL",
        "kr_name": "신규요청URL",
        "description": "랜딩 접수 폼 링크",
        "sample": "https://micego.example/ko/#register",
        "maxLen": 60
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "ORG_BIDDING": {
    "id": "ORG_BIDDING",
    "name": "비딩중 진입",
    "recipient": "org",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": true,
      "lms": true,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 호텔에 견적을 요청했습니다 · {{RFP_ID}}",
      "preheader": "요청번호 {{RFP_ID}} · 견적 마감 {{DEADLINE_KST}} · 비교표는 {{COMPARE_DATE}}까지 전달합니다.",
      "cc": "",
      "optional_blocks": [
        "REGIONAL_PARTNER"
      ]
    },
    "alimtalk": {
      "code": "micego_org_bidding",
      "body": "[MICEGO] 호텔에 견적을 요청했습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청의 검토를 마치고 조건에 맞는 해외 호텔 몇 곳에 요청을 보냈습니다.\n\n■ 호텔 견적 마감: {{DEADLINE_KST}}\n■ 비교표 전달 예정일: {{COMPARE_DATE}}\n\n마감 후 받은 제안을 비교표로 정리해 다시 알려 드립니다. 진행 상황은 아래 버튼에서 확인하실 수 있습니다.\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.",
      "buttons": [
        {
          "name": "진행 상황 보기",
          "url": "https://micego.example/ko/track.html?t={{TRACK_TOKEN}}"
        }
      ],
      "fallback_title": "[MICEGO] 호텔 견적 요청 안내",
      "fallback_body": "[MICEGO] 호텔에 견적을 요청했습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청의 검토를 마치고 조건에 맞는 해외 호텔 몇 곳에 요청을 보냈습니다.\n\n■ 호텔 견적 마감: {{DEADLINE_KST}}\n■ 비교표 전달 예정일: {{COMPARE_DATE}}\n\n마감 후 받은 제안을 비교표로 정리해 다시 알려 드립니다. 진행 상황은 아래 버튼에서 확인하실 수 있습니다.\n\n▶ 진행 상황: https://micego.example/ko/track.html?t={{TRACK_TOKEN}}\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다."
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "DEADLINE_KST",
        "kr_name": "견적마감",
        "description": "호텔 견적 마감 (KST)",
        "sample": "2026-10-08(목) 18:00 KST",
        "maxLen": 26
      },
      {
        "key": "COMPARE_DATE",
        "kr_name": "비교표예정일",
        "description": "비교표 전달 예정일",
        "sample": "2026-10-12(월)",
        "maxLen": 14
      },
      {
        "key": "ORG_CONTACT_NAME",
        "kr_name": "담당자명",
        "description": "오거나이저 담당자 이름·직함",
        "sample": "김지은 과장",
        "maxLen": 20
      },
      {
        "key": "DESTINATION",
        "kr_name": "목적지",
        "description": "행사 목적지",
        "sample": "다낭",
        "maxLen": 20
      },
      {
        "key": "EVENT_TYPE",
        "kr_name": "행사유형",
        "description": "행사 유형",
        "sample": "인센티브",
        "maxLen": 12
      },
      {
        "key": "PAX",
        "kr_name": "인원",
        "description": "예상 인원",
        "sample": "150–199명",
        "maxLen": 14
      },
      {
        "key": "EVENT_DATES",
        "kr_name": "행사일정",
        "description": "행사 기간",
        "sample": "2027-03-15~18",
        "maxLen": 20
      },
      {
        "key": "PARTNER_PUBLIC_NAME",
        "kr_name": "지역파트너",
        "description": "호텔에 보이는 지역 파트너 이름",
        "sample": "MICEGO Thailand",
        "maxLen": 40
      },
      {
        "key": "TRACK_URL",
        "kr_name": "추적링크",
        "description": "오거나이저 추적 링크 전체 (이메일용)",
        "sample": "https://micego.example/ko/track.html?t=demo-2610",
        "maxLen": 90
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      },
      {
        "key": "TRACK_TOKEN",
        "kr_name": "추적토큰",
        "description": "추적 링크 토큰 (알림톡 버튼·LMS용, URL 끝 변수)",
        "sample": "demo-2610",
        "maxLen": 40
      }
    ]
  },
  "ORG_REBID": {
    "id": "ORG_REBID",
    "name": "새 라운드 (조건 변경)",
    "recipient": "org",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": true,
      "lms": true,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 바뀐 조건으로 호텔에 다시 요청했습니다 · {{RFP_ID}}",
      "preheader": "요청번호 {{RFP_ID}} · 새 견적 마감 {{DEADLINE_KST}} · 비교표는 {{COMPARE_DATE}}까지.",
      "cc": "",
      "optional_blocks": []
    },
    "alimtalk": {
      "code": "micego_org_rebid",
      "body": "[MICEGO] 바뀐 조건으로 호텔에 다시 요청했습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청의 조건이 바뀌어 {{ROUND}}차로 호텔에 다시 요청을 보냈습니다.\n\n■ 변경 내용: {{CHANGE_SUMMARY}}\n■ 새 견적 마감: {{DEADLINE_KST}}\n■ 새 비교표 예정일: {{COMPARE_DATE}}\n\n이전에 받은 제안은 기록으로 보관됩니다. 진행 상황은 아래 버튼에서 확인하실 수 있습니다.\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.",
      "buttons": [
        {
          "name": "진행 상황 보기",
          "url": "https://micego.example/ko/track.html?t={{TRACK_TOKEN}}"
        }
      ],
      "fallback_title": "[MICEGO] 호텔 재요청 안내",
      "fallback_body": "[MICEGO] 바뀐 조건으로 호텔에 다시 요청했습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청의 조건이 바뀌어 {{ROUND}}차로 호텔에 다시 요청을 보냈습니다.\n\n■ 변경 내용: {{CHANGE_SUMMARY}}\n■ 새 견적 마감: {{DEADLINE_KST}}\n■ 새 비교표 예정일: {{COMPARE_DATE}}\n\n이전에 받은 제안은 기록으로 보관됩니다. 진행 상황은 아래 버튼에서 확인하실 수 있습니다.\n\n▶ 진행 상황: https://micego.example/ko/track.html?t={{TRACK_TOKEN}}\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다."
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "DEADLINE_KST",
        "kr_name": "견적마감",
        "description": "호텔 견적 마감 (KST)",
        "sample": "2026-10-08(목) 18:00 KST",
        "maxLen": 26
      },
      {
        "key": "COMPARE_DATE",
        "kr_name": "비교표예정일",
        "description": "비교표 전달 예정일",
        "sample": "2026-10-12(월)",
        "maxLen": 14
      },
      {
        "key": "ORG_CONTACT_NAME",
        "kr_name": "담당자명",
        "description": "오거나이저 담당자 이름·직함",
        "sample": "김지은 과장",
        "maxLen": 20
      },
      {
        "key": "ROUND",
        "kr_name": "라운드",
        "description": "요청 라운드 (2 이상)",
        "sample": "2",
        "maxLen": 2
      },
      {
        "key": "CHANGE_SUMMARY",
        "kr_name": "변경내용",
        "description": "바뀐 조건 요약 한 줄",
        "sample": "인원 150–199명 → 200–250명, 행사일 2027-03-22~25",
        "maxLen": 60
      },
      {
        "key": "DESTINATION",
        "kr_name": "목적지",
        "description": "행사 목적지",
        "sample": "다낭",
        "maxLen": 20
      },
      {
        "key": "EVENT_TYPE",
        "kr_name": "행사유형",
        "description": "행사 유형",
        "sample": "인센티브",
        "maxLen": 12
      },
      {
        "key": "TRACK_URL",
        "kr_name": "추적링크",
        "description": "오거나이저 추적 링크 전체 (이메일용)",
        "sample": "https://micego.example/ko/track.html?t=demo-2610",
        "maxLen": 90
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      },
      {
        "key": "TRACK_TOKEN",
        "kr_name": "추적토큰",
        "description": "추적 링크 토큰 (알림톡 버튼·LMS용, URL 끝 변수)",
        "sample": "demo-2610",
        "maxLen": 40
      }
    ]
  },
  "ORG_DELIVERED": {
    "id": "ORG_DELIVERED",
    "name": "견적 도착 (전달됨)",
    "recipient": "org",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": true,
      "lms": true,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 받은 제안을 비교표로 전달드립니다 · {{RFP_ID}}",
      "preheader": "요청번호 {{RFP_ID}} · 제안 {{PROPOSAL_COUNT}}건 · 가장 빠른 견적 유효기한 {{VALID_UNTIL_MIN}}",
      "cc": "",
      "optional_blocks": []
    },
    "alimtalk": {
      "code": "micego_org_delivered",
      "body": "[MICEGO] 받은 제안을 비교표로 전달드립니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청에 호텔 제안이 도착해 비교표로 정리했습니다.\n\n■ 받은 제안: {{PROPOSAL_COUNT}}건\n■ 가장 빠른 견적 유효기한: {{VALID_UNTIL_MIN}}\n\n비교표는 아래 버튼에서 보실 수 있고, 호텔 이름은 선택 전까지 제안 A·B·C로 표시됩니다. 고르신 제안은 페이지의 「제안 선택하기」 버튼으로 메일 초안을 열거나, MICEGO에서 받은 이메일에 회신해 알려 주세요.\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.",
      "buttons": [
        {
          "name": "비교표 보기",
          "url": "https://micego.example/ko/track.html?t={{TRACK_TOKEN}}"
        }
      ],
      "fallback_title": "[MICEGO] 비교표 도착",
      "fallback_body": "[MICEGO] 받은 제안을 비교표로 전달드립니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청에 호텔 제안이 도착해 비교표로 정리했습니다.\n\n■ 받은 제안: {{PROPOSAL_COUNT}}건\n■ 가장 빠른 견적 유효기한: {{VALID_UNTIL_MIN}}\n\n비교표는 아래 버튼에서 보실 수 있고, 호텔 이름은 선택 전까지 제안 A·B·C로 표시됩니다. 고르신 제안은 페이지의 「제안 선택하기」 버튼으로 메일 초안을 열거나, MICEGO에서 받은 이메일에 회신해 알려 주세요.\n\n▶ 비교표 보기: https://micego.example/ko/track.html?t={{TRACK_TOKEN}}\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다."
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "PROPOSAL_COUNT",
        "kr_name": "제안건수",
        "description": "받은 제안 수",
        "sample": "3",
        "maxLen": 2
      },
      {
        "key": "VALID_UNTIL_MIN",
        "kr_name": "유효기한",
        "description": "제안 중 가장 빠른 견적 유효기한",
        "sample": "2026-12-15",
        "maxLen": 10
      },
      {
        "key": "ORG_CONTACT_NAME",
        "kr_name": "담당자명",
        "description": "오거나이저 담당자 이름·직함",
        "sample": "김지은 과장",
        "maxLen": 20
      },
      {
        "key": "TRACK_URL",
        "kr_name": "추적링크",
        "description": "오거나이저 추적 링크 전체 (이메일용)",
        "sample": "https://micego.example/ko/track.html?t=demo-2610",
        "maxLen": 90
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      },
      {
        "key": "TRACK_TOKEN",
        "kr_name": "추적토큰",
        "description": "추적 링크 토큰 (알림톡 버튼·LMS용, URL 끝 변수)",
        "sample": "demo-2610",
        "maxLen": 40
      }
    ]
  },
  "ORG_WON": {
    "id": "ORG_WON",
    "name": "성사 (호텔 선정·연결)",
    "recipient": "org",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": true,
      "lms": true,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 선정하신 호텔과 연결해 드렸습니다 · {{RFP_ID}}",
      "preheader": "요청번호 {{RFP_ID}} · {{SELECTED_HOTEL}} 담당자에게 연결 메일을 보냈고 참조로 넣었습니다.",
      "cc": "",
      "optional_blocks": []
    },
    "alimtalk": {
      "code": "micego_org_won",
      "body": "[MICEGO] 선정하신 호텔과 연결해 드렸습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청의 선정 호텔은 {{SELECTED_HOTEL}}입니다.\n\n호텔 담당자에게 연결 메일을 보냈고 담당자님을 참조로 넣었습니다. 호텔에는 회사명({{ORG_COMPANY}})과 담당자 연락처(이메일·전화)가 전달되었습니다.\n\n계약과 결제는 호텔과 직접 진행하시면 됩니다. 주최 측 수수료는 없습니다.\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.",
      "buttons": [
        {
          "name": "진행 상황 보기",
          "url": "https://micego.example/ko/track.html?t={{TRACK_TOKEN}}"
        }
      ],
      "fallback_title": "[MICEGO] 호텔 선정·연결 안내",
      "fallback_body": "[MICEGO] 선정하신 호텔과 연결해 드렸습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청의 선정 호텔은 {{SELECTED_HOTEL}}입니다.\n\n호텔 담당자에게 연결 메일을 보냈고 담당자님을 참조로 넣었습니다. 호텔에는 회사명({{ORG_COMPANY}})과 담당자 연락처(이메일·전화)가 전달되었습니다.\n\n계약과 결제는 호텔과 직접 진행하시면 됩니다. 주최 측 수수료는 없습니다.\n\n▶ 진행 상황: https://micego.example/ko/track.html?t={{TRACK_TOKEN}}\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다."
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "SELECTED_HOTEL",
        "kr_name": "선정호텔",
        "description": "선정된 호텔명",
        "sample": "Ocean Pearl Resort Da Nang",
        "maxLen": 50
      },
      {
        "key": "ORG_CONTACT_NAME",
        "kr_name": "담당자명",
        "description": "오거나이저 담당자 이름·직함",
        "sample": "김지은 과장",
        "maxLen": 20
      },
      {
        "key": "TRACK_URL",
        "kr_name": "추적링크",
        "description": "오거나이저 추적 링크 전체 (이메일용)",
        "sample": "https://micego.example/ko/track.html?t=demo-2610",
        "maxLen": 90
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      },
      {
        "key": "ORG_COMPANY",
        "kr_name": "회사명",
        "description": "오거나이저 회사명",
        "sample": "한빛투어(주)",
        "maxLen": 30
      },
      {
        "key": "TRACK_TOKEN",
        "kr_name": "추적토큰",
        "description": "추적 링크 토큰 (알림톡 버튼·LMS용, URL 끝 변수)",
        "sample": "demo-2610",
        "maxLen": 40
      }
    ]
  },
  "ORG_LOST": {
    "id": "ORG_LOST",
    "name": "미성사 종료",
    "recipient": "org",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": true,
      "lms": true,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 이번 요청은 성사 없이 종료되었습니다 · {{RFP_ID}}",
      "preheader": "요청번호 {{RFP_ID}} · 종료 사유와 이후 안내를 드립니다. 새 요청은 언제든 가능합니다.",
      "cc": "",
      "optional_blocks": []
    },
    "alimtalk": {
      "code": "micego_org_lost",
      "body": "[MICEGO] 이번 요청은 성사 없이 종료되었습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청을 종료했습니다.\n\n■ 사유: {{LOST_REASON}}\n\n호텔에는 종료 결과만 전달되며, 회사명과 담당자 연락처는 전달되지 않았습니다. 조건이 정해지면 새로 요청해 주세요.\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.",
      "buttons": [
        {
          "name": "진행 상황 보기",
          "url": "https://micego.example/ko/track.html?t={{TRACK_TOKEN}}"
        }
      ],
      "fallback_title": "[MICEGO] 요청 종료 안내",
      "fallback_body": "[MICEGO] 이번 요청은 성사 없이 종료되었습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청을 종료했습니다.\n\n■ 사유: {{LOST_REASON}}\n\n호텔에는 종료 결과만 전달되며, 회사명과 담당자 연락처는 전달되지 않았습니다. 조건이 정해지면 새로 요청해 주세요.\n\n▶ 진행 상황: https://micego.example/ko/track.html?t={{TRACK_TOKEN}}\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다."
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "ORG_CONTACT_NAME",
        "kr_name": "담당자명",
        "description": "오거나이저 담당자 이름·직함",
        "sample": "김지은 과장",
        "maxLen": 20
      },
      {
        "key": "DESTINATION",
        "kr_name": "목적지",
        "description": "행사 목적지",
        "sample": "다낭",
        "maxLen": 20
      },
      {
        "key": "EVENT_TYPE",
        "kr_name": "행사유형",
        "description": "행사 유형",
        "sample": "인센티브",
        "maxLen": 12
      },
      {
        "key": "PAX",
        "kr_name": "인원",
        "description": "예상 인원",
        "sample": "150–199명",
        "maxLen": 14
      },
      {
        "key": "LOST_REASON",
        "kr_name": "미성사사유",
        "description": "미성사 사유 문장 (고정 3종 중 택1, 아래 표)",
        "sample": "받으신 제안 중 선택하지 않으셔서 종료했습니다.",
        "maxLen": 45
      },
      {
        "key": "TRACK_URL",
        "kr_name": "추적링크",
        "description": "오거나이저 추적 링크 전체 (이메일용)",
        "sample": "https://micego.example/ko/track.html?t=demo-2610",
        "maxLen": 90
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      },
      {
        "key": "TRACK_TOKEN",
        "kr_name": "추적토큰",
        "description": "추적 링크 토큰 (알림톡 버튼·LMS용, URL 끝 변수)",
        "sample": "demo-2610",
        "maxLen": 40
      }
    ]
  },
  "ORG_CANCELLED": {
    "id": "ORG_CANCELLED",
    "name": "취소 확인",
    "recipient": "org",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": true,
      "lms": true,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 요청이 취소되었습니다 · {{RFP_ID}}",
      "preheader": "요청번호 {{RFP_ID}} · 취소를 확인했습니다. 회사명과 연락처는 어느 호텔에도 전달되지 않았습니다.",
      "cc": "",
      "optional_blocks": []
    },
    "alimtalk": {
      "code": "micego_org_cancelled",
      "body": "[MICEGO] 요청이 취소되었습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청의 취소를 확인했습니다.\n\n■ 행사: {{DESTINATION}} {{EVENT_TYPE}}\n■ 취소일시: {{CANCELLED_AT}}\n\n회사명과 담당자 연락처는 어느 호텔에도 전달되지 않았습니다. 다시 진행하실 때는 새로 요청해 주세요.\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.",
      "buttons": [
        {
          "name": "진행 상황 보기",
          "url": "https://micego.example/ko/track.html?t={{TRACK_TOKEN}}"
        }
      ],
      "fallback_title": "[MICEGO] 요청 취소 확인",
      "fallback_body": "[MICEGO] 요청이 취소되었습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청의 취소를 확인했습니다.\n\n■ 행사: {{DESTINATION}} {{EVENT_TYPE}}\n■ 취소일시: {{CANCELLED_AT}}\n\n회사명과 담당자 연락처는 어느 호텔에도 전달되지 않았습니다. 다시 진행하실 때는 새로 요청해 주세요.\n\n▶ 진행 상황: https://micego.example/ko/track.html?t={{TRACK_TOKEN}}\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다."
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "ORG_CONTACT_NAME",
        "kr_name": "담당자명",
        "description": "오거나이저 담당자 이름·직함",
        "sample": "김지은 과장",
        "maxLen": 20
      },
      {
        "key": "DESTINATION",
        "kr_name": "목적지",
        "description": "행사 목적지",
        "sample": "다낭",
        "maxLen": 20
      },
      {
        "key": "EVENT_TYPE",
        "kr_name": "행사유형",
        "description": "행사 유형",
        "sample": "인센티브",
        "maxLen": 12
      },
      {
        "key": "CANCELLED_AT",
        "kr_name": "취소일시",
        "description": "취소 처리 시각 (KST)",
        "sample": "2026-09-28 10:05",
        "maxLen": 16
      },
      {
        "key": "TRACK_URL",
        "kr_name": "추적링크",
        "description": "오거나이저 추적 링크 전체 (이메일용)",
        "sample": "https://micego.example/ko/track.html?t=demo-2610",
        "maxLen": 90
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      },
      {
        "key": "TRACK_TOKEN",
        "kr_name": "추적토큰",
        "description": "추적 링크 토큰 (알림톡 버튼·LMS용, URL 끝 변수)",
        "sample": "demo-2610",
        "maxLen": 40
      }
    ]
  },
  "ORG_PICK_OTP": {
    "id": "ORG_PICK_OTP",
    "name": "제안 선택 인증번호 (문자)",
    "recipient": "org",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": false,
      "alimtalk": false,
      "lms": false,
      "sms": true
    },
    "sms": {
      "body": "[MICEGO] {{RFP_ID}} 제안 선택 인증번호 [{{CODE}}] (3분). 요청하지 않았다면 무시하세요.",
      "limit_bytes": 90
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "CODE",
        "kr_name": "인증번호",
        "description": "6자리 인증번호 (숫자)",
        "sample": "123456",
        "maxLen": 6
      }
    ]
  },
  "HTL_INVITE": {
    "id": "HTL_INVITE",
    "name": "Bid invitation",
    "recipient": "htl",
    "mode": "auto",
    "language": "en",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] New group request · REF {{RFP_ID}} · quotes by {{DEADLINE_KST}}",
      "subject_round2": "[MICEGO] Updated request, new deadline · REF {{RFP_ID}} · quotes by {{DEADLINE_KST}}",
      "preheader": "Ref {{RFP_ID}} · {{DESTINATION}} · Quotes due {{DEADLINE_KST}}.",
      "cc": "",
      "optional_blocks": [
        "REINVITE"
      ]
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "DEADLINE_KST",
        "kr_name": "견적마감",
        "description": "호텔 견적 마감 (KST)",
        "sample": "Thu 8 Oct 2026, 18:00 KST",
        "maxLen": 26
      },
      {
        "key": "DESTINATION",
        "kr_name": "목적지",
        "description": "행사 목적지",
        "sample": "Da Nang, Vietnam",
        "maxLen": 20
      },
      {
        "key": "HOTEL_BID_URL",
        "kr_name": "호텔링크",
        "description": "호텔 개인 견적 링크 전체",
        "sample": "https://micego.example/en/bid.html?t=demo-2610",
        "maxLen": 90
      },
      {
        "key": "EVENT_TYPE",
        "kr_name": "행사유형",
        "description": "행사 유형",
        "sample": "Incentive program",
        "maxLen": 12
      },
      {
        "key": "EVENT_DATES",
        "kr_name": "행사일정",
        "description": "행사 기간",
        "sample": "Mon 15 – Thu 18 Mar 2027 (3 nights)",
        "maxLen": 20
      },
      {
        "key": "PAX",
        "kr_name": "인원",
        "description": "예상 인원",
        "sample": "150–199 attendees",
        "maxLen": 14
      },
      {
        "key": "ROOMS",
        "kr_name": "객실",
        "description": "필요 객실 구성",
        "sample": "Twin 60 / King 20 (240 room-nights)",
        "maxLen": 20
      },
      {
        "key": "EVENT_SPACE",
        "kr_name": "연회장",
        "description": "연회장 사용 (호텔 공개 요건)",
        "sample": "Gala dinner · Night 3 (Wed 17 Mar 2027)",
        "maxLen": 60
      },
      {
        "key": "PUBLIC_NOTE",
        "kr_name": "공개메모",
        "description": "운영자가 검토한 공개 메모",
        "sample": "Full details are on the request page.",
        "maxLen": 200
      },
      {
        "key": "ROUND",
        "kr_name": "라운드",
        "description": "요청 라운드 (2 이상)",
        "sample": "2",
        "maxLen": 2
      },
      {
        "key": "CHANGE_SUMMARY",
        "kr_name": "변경내용",
        "description": "바뀐 조건 요약 한 줄",
        "sample": "Attendees 150–199 → 200–250; dates now 22–25 Mar 2027",
        "maxLen": 60
      },
      {
        "key": "PREV_DEADLINE",
        "kr_name": "이전마감",
        "description": "이전 라운드 마감",
        "sample": "Thu 8 Oct 2026, 18:00 KST",
        "maxLen": 30
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      },
      {
        "key": "UNSUBSCRIBE_URL",
        "kr_name": "수신거부URL",
        "description": "초대 메일 수신거부 링크",
        "sample": "https://micego.example/en/unsubscribe.html?t=demo-2610",
        "maxLen": 90
      }
    ]
  },
  "HTL_REMINDER": {
    "id": "HTL_REMINDER",
    "name": "Deadline reminder (24h)",
    "recipient": "htl",
    "mode": "auto",
    "language": "en",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] Reminder: quotes close in 24 hours · REF {{RFP_ID}} · quotes by {{DEADLINE_KST}}",
      "preheader": "Ref {{RFP_ID}} · {{PAX}} · Quotes close {{DEADLINE_KST}}.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "DEADLINE_KST",
        "kr_name": "견적마감",
        "description": "호텔 견적 마감 (KST)",
        "sample": "Thu 8 Oct 2026, 18:00 KST",
        "maxLen": 26
      },
      {
        "key": "PAX",
        "kr_name": "인원",
        "description": "예상 인원",
        "sample": "150–199 attendees",
        "maxLen": 14
      },
      {
        "key": "HOTEL_BID_URL",
        "kr_name": "호텔링크",
        "description": "호텔 개인 견적 링크 전체",
        "sample": "https://micego.example/en/bid.html?t=demo-2610",
        "maxLen": 90
      },
      {
        "key": "DESTINATION",
        "kr_name": "목적지",
        "description": "행사 목적지",
        "sample": "Da Nang, Vietnam",
        "maxLen": 20
      },
      {
        "key": "EVENT_DATES",
        "kr_name": "행사일정",
        "description": "행사 기간",
        "sample": "Mon 15 – Thu 18 Mar 2027 (3 nights)",
        "maxLen": 20
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      },
      {
        "key": "UNSUBSCRIBE_URL",
        "kr_name": "수신거부URL",
        "description": "초대 메일 수신거부 링크",
        "sample": "https://micego.example/en/unsubscribe.html?t=demo-2610",
        "maxLen": 90
      }
    ]
  },
  "HTL_QUOTE_RECEIVED": {
    "id": "HTL_QUOTE_RECEIVED",
    "name": "Quote received",
    "recipient": "htl",
    "mode": "auto",
    "language": "en",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] Quote received · REF {{RFP_ID}}",
      "preheader": "Ref {{RFP_ID}} · Quote received ({{CURRENCY}}). Revise until {{DEADLINE_KST}}.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "CURRENCY",
        "kr_name": "통화",
        "description": "제출 통화",
        "sample": "USD",
        "maxLen": 3
      },
      {
        "key": "DEADLINE_KST",
        "kr_name": "견적마감",
        "description": "호텔 견적 마감 (KST)",
        "sample": "Thu 8 Oct 2026, 18:00 KST",
        "maxLen": 26
      },
      {
        "key": "HOTEL_CONTACT_NAME",
        "kr_name": "호텔담당자",
        "description": "호텔 담당자 이름",
        "sample": "Ms. Linh",
        "maxLen": 30
      },
      {
        "key": "DESTINATION",
        "kr_name": "목적지",
        "description": "행사 목적지",
        "sample": "Da Nang, Vietnam",
        "maxLen": 20
      },
      {
        "key": "PAX",
        "kr_name": "인원",
        "description": "예상 인원",
        "sample": "150–199 attendees",
        "maxLen": 14
      },
      {
        "key": "SUBMITTED_AT",
        "kr_name": "제출일시",
        "description": "견적 제출·수정 시각",
        "sample": "Wed 7 Oct 2026, 15:42 KST",
        "maxLen": 30
      },
      {
        "key": "HOTEL_BID_URL",
        "kr_name": "호텔링크",
        "description": "호텔 개인 견적 링크 전체",
        "sample": "https://micego.example/en/bid.html?t=demo-2610",
        "maxLen": 90
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "HTL_SELECTED_CONNECT": {
    "id": "HTL_SELECTED_CONNECT",
    "name": "Selected + organizer introduction",
    "recipient": "htl",
    "mode": "auto",
    "language": "en",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] Your proposal was selected · REF {{RFP_ID}}",
      "preheader": "Ref {{RFP_ID}} · The organizer selected your proposal. Their contact details are below.",
      "cc": "{{ORG_EMAIL}}",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "HOTEL_NAME",
        "kr_name": "호텔명",
        "description": "수신 호텔(숙박시설)명",
        "sample": "Ocean Pearl Resort Da Nang",
        "maxLen": 50
      },
      {
        "key": "ORG_EMAIL",
        "kr_name": "이메일",
        "description": "오거나이저 담당자 이메일",
        "sample": "jieun.kim@hanbit-tour.example",
        "maxLen": 50
      },
      {
        "key": "ORG_COMPANY",
        "kr_name": "회사명",
        "description": "오거나이저 회사명",
        "sample": "Hanbit Tour Co., Ltd.",
        "maxLen": 30
      },
      {
        "key": "ORG_CONTACT_FULL",
        "kr_name": "담당자",
        "description": "오거나이저 담당자 (호텔에 전달)",
        "sample": "Jieun Kim (Manager)",
        "maxLen": 30
      },
      {
        "key": "ORG_PHONE",
        "kr_name": "연락처",
        "description": "오거나이저 담당자 전화",
        "sample": "010-0000-0014",
        "maxLen": 16
      },
      {
        "key": "DESTINATION",
        "kr_name": "목적지",
        "description": "행사 목적지",
        "sample": "Da Nang, Vietnam",
        "maxLen": 20
      },
      {
        "key": "PAX",
        "kr_name": "인원",
        "description": "예상 인원",
        "sample": "150–199 attendees",
        "maxLen": 14
      },
      {
        "key": "EVENT_DATES",
        "kr_name": "행사일정",
        "description": "행사 기간",
        "sample": "Mon 15 – Thu 18 Mar 2027 (3 nights)",
        "maxLen": 20
      },
      {
        "key": "HOTEL_BID_URL",
        "kr_name": "호텔링크",
        "description": "호텔 개인 견적 링크 전체",
        "sample": "https://micego.example/en/bid.html?t=demo-2610",
        "maxLen": 90
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "HTL_NOT_SELECTED": {
    "id": "HTL_NOT_SELECTED",
    "name": "Not selected",
    "recipient": "htl",
    "mode": "auto",
    "language": "en",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] Result: not selected this time · REF {{RFP_ID}}",
      "preheader": "Ref {{RFP_ID}} · The organizer chose another proposal. Your details were not shared.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "HOTEL_CONTACT_NAME",
        "kr_name": "호텔담당자",
        "description": "호텔 담당자 이름",
        "sample": "Ms. Linh",
        "maxLen": 30
      },
      {
        "key": "DESTINATION",
        "kr_name": "목적지",
        "description": "행사 목적지",
        "sample": "Da Nang, Vietnam",
        "maxLen": 20
      },
      {
        "key": "PAX",
        "kr_name": "인원",
        "description": "예상 인원",
        "sample": "150–199 attendees",
        "maxLen": 14
      },
      {
        "key": "EVENT_DATES",
        "kr_name": "행사일정",
        "description": "행사 기간",
        "sample": "Mon 15 – Thu 18 Mar 2027 (3 nights)",
        "maxLen": 20
      },
      {
        "key": "HOTEL_BID_URL",
        "kr_name": "호텔링크",
        "description": "호텔 개인 견적 링크 전체",
        "sample": "https://micego.example/en/bid.html?t=demo-2610",
        "maxLen": 90
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "HTL_CONFIRM": {
    "id": "HTL_CONFIRM",
    "name": "Confirm quote entered on your behalf",
    "recipient": "htl",
    "mode": "auto",
    "language": "en",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] Please confirm the quote entered for your property · REF {{RFP_ID}}",
      "preheader": "Ref {{RFP_ID}} · A quote was entered for you. Confirm within {{EXPIRES_HOURS}} hours.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "EXPIRES_HOURS",
        "kr_name": "유효시간",
        "description": "확인 링크 유효 시간(시간)",
        "sample": "72",
        "maxLen": 4
      },
      {
        "key": "HOTEL_CONTACT_NAME",
        "kr_name": "호텔담당자",
        "description": "호텔 담당자 이름",
        "sample": "Ms. Linh",
        "maxLen": 30
      },
      {
        "key": "PARTNER_PUBLIC_NAME",
        "kr_name": "지역파트너",
        "description": "호텔에 보이는 지역 파트너 이름",
        "sample": "MICEGO Thailand",
        "maxLen": 40
      },
      {
        "key": "DESTINATION",
        "kr_name": "목적지",
        "description": "행사 목적지",
        "sample": "Da Nang, Vietnam",
        "maxLen": 20
      },
      {
        "key": "PAX",
        "kr_name": "인원",
        "description": "예상 인원",
        "sample": "150–199 attendees",
        "maxLen": 14
      },
      {
        "key": "EVENT_DATES",
        "kr_name": "행사일정",
        "description": "행사 기간",
        "sample": "Mon 15 – Thu 18 Mar 2027 (3 nights)",
        "maxLen": 20
      },
      {
        "key": "ROUND",
        "kr_name": "라운드",
        "description": "요청 라운드 (2 이상)",
        "sample": "2",
        "maxLen": 2
      },
      {
        "key": "CONFIRM_URL",
        "kr_name": "확인링크",
        "description": "대리 입력 견적 확인 링크 (1회용·72h)",
        "sample": "https://micego.example/en/confirm.html?t=demo-confirm-2610",
        "maxLen": 90
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "CONSOLE_NOTICE": {
    "id": "CONSOLE_NOTICE",
    "name": "콘솔 내부 알림 (지역 파트너 · 본사)",
    "recipient": "ptr",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO 콘솔] {{NOTICE_TITLE}}",
      "preheader": "{{NOTICE_TITLE}} · 지역 파트너 콘솔 알림입니다. 자세한 내용은 콘솔에서 확인하세요.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "NOTICE_TITLE",
        "kr_name": "알림제목",
        "description": "콘솔 내부 알림 제목",
        "sample": "파트너 배정 · MG-2610-014",
        "maxLen": 60
      },
      {
        "key": "NOTICE_BODY",
        "kr_name": "알림내용",
        "description": "콘솔 내부 알림 본문",
        "sample": "태국 요청 MG-2610-014이(가) 티엠타이(Tmthai)에 배정되었습니다.",
        "maxLen": 400
      },
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "CONSOLE_URL",
        "kr_name": "콘솔링크",
        "description": "콘솔 해당 화면 링크",
        "sample": "https://micego.example/admin/rfp.html?id=MG-2610-014",
        "maxLen": 90
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "PTN_APPLIED": {
    "id": "PTN_APPLIED",
    "name": "Partner application received",
    "recipient": "ptn",
    "mode": "auto",
    "language": "en",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] Partner application received · REF {{PARTNER_ID}}",
      "preheader": "Ref {{PARTNER_ID}} · We received your application and will reply within 5 business days.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "PARTNER_ID",
        "kr_name": "신청번호",
        "description": "파트너 신청 번호",
        "sample": "PT-2609-007",
        "maxLen": 12
      },
      {
        "key": "APPLICANT_NAME",
        "kr_name": "신청자",
        "description": "파트너 신청 담당자 이름",
        "sample": "Putri Wijaya",
        "maxLen": 30
      },
      {
        "key": "PROPERTY_NAME",
        "kr_name": "시설명",
        "description": "파트너 신청 숙박시설명",
        "sample": "Sanur Lagoon Resort",
        "maxLen": 50
      },
      {
        "key": "PROPERTY_LOCATION",
        "kr_name": "소재지",
        "description": "숙박시설 소재지",
        "sample": "Sanur, Bali, Indonesia",
        "maxLen": 40
      },
      {
        "key": "APPLIED_AT",
        "kr_name": "신청일시",
        "description": "파트너 신청 시각",
        "sample": "Tue 6 Oct 2026, 10:12 KST",
        "maxLen": 30
      },
      {
        "key": "REVIEW_BY",
        "kr_name": "회신기한",
        "description": "파트너 심사 회신 기한 (5영업일)",
        "sample": "Tue 13 Oct 2026, 18:00 KST",
        "maxLen": 30
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "PTN_APPROVED": {
    "id": "PTN_APPROVED",
    "name": "Partner approved",
    "recipient": "ptn",
    "mode": "auto",
    "language": "en",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] Partner application approved · REF {{PARTNER_ID}}",
      "preheader": "Ref {{PARTNER_ID}} · You're approved. Invitations arrive by email; here is how it works.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "PARTNER_ID",
        "kr_name": "신청번호",
        "description": "파트너 신청 번호",
        "sample": "PT-2609-007",
        "maxLen": 12
      },
      {
        "key": "PROPERTY_NAME",
        "kr_name": "시설명",
        "description": "파트너 신청 숙박시설명",
        "sample": "Sanur Lagoon Resort",
        "maxLen": 50
      },
      {
        "key": "PROPERTY_LOCATION",
        "kr_name": "소재지",
        "description": "숙박시설 소재지",
        "sample": "Sanur, Bali, Indonesia",
        "maxLen": 40
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "PTN_REJECTED": {
    "id": "PTN_REJECTED",
    "name": "Partner not approved",
    "recipient": "ptn",
    "mode": "auto",
    "language": "en",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] Partner application update · REF {{PARTNER_ID}}",
      "preheader": "Ref {{PARTNER_ID}} · We can't approve this application right now. The reason is inside.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "PARTNER_ID",
        "kr_name": "신청번호",
        "description": "파트너 신청 번호",
        "sample": "PT-2609-007",
        "maxLen": 12
      },
      {
        "key": "APPLICANT_NAME",
        "kr_name": "신청자",
        "description": "파트너 신청 담당자 이름",
        "sample": "Nattapong S.",
        "maxLen": 30
      },
      {
        "key": "PROPERTY_NAME",
        "kr_name": "시설명",
        "description": "파트너 신청 숙박시설명",
        "sample": "Patong Sands Hotel",
        "maxLen": 50
      },
      {
        "key": "PROPERTY_LOCATION",
        "kr_name": "소재지",
        "description": "숙박시설 소재지",
        "sample": "Patong, Phuket, Thailand",
        "maxLen": 40
      },
      {
        "key": "PTN_REJECT_REASON",
        "kr_name": "거절사유",
        "description": "파트너 거절 사유 문장 (고정 5종 중 택1, 아래 표)",
        "sample": "Our organizers' groups start at 50 attendees, and the group capacity you listed is below that.",
        "maxLen": 120
      },
      {
        "key": "PARTNER_APPLY_URL",
        "kr_name": "파트너신청URL",
        "description": "파트너 신청 페이지 링크",
        "sample": "https://micego.example/en/index.html#register",
        "maxLen": 60
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "PTN_REINSTATED": {
    "id": "PTN_REINSTATED",
    "name": "Partner reinstated",
    "recipient": "ptn",
    "mode": "auto",
    "language": "en",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] Your listing is active again · REF {{PARTNER_ID}}",
      "preheader": "Ref {{PARTNER_ID}} · Thanks for getting back to us. Invitations will resume.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "PARTNER_ID",
        "kr_name": "신청번호",
        "description": "파트너 신청 번호",
        "sample": "PT-2609-007",
        "maxLen": 12
      },
      {
        "key": "PROPERTY_NAME",
        "kr_name": "시설명",
        "description": "파트너 신청 숙박시설명",
        "sample": "Sanur Lagoon Resort",
        "maxLen": 50
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "ACC_EMAIL_CODE": {
    "id": "ACC_EMAIL_CODE",
    "name": "이메일 인증번호",
    "recipient": "mem",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 이메일 인증번호를 보내드립니다",
      "preheader": "{{PURPOSE}} 화면에 아래 6자리 인증번호를 입력해 주세요. 유효 시간은 {{EXPIRES_MIN}}분입니다.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "PURPOSE",
        "kr_name": "인증목적",
        "description": "이메일 인증 목적 (회원 가입 · 이메일 변경 중 택1)",
        "sample": "회원 가입",
        "maxLen": 8
      },
      {
        "key": "EXPIRES_MIN",
        "kr_name": "유효시간",
        "description": "인증번호·링크 유효 시간 (분)",
        "sample": "10",
        "maxLen": 2
      },
      {
        "key": "CODE",
        "kr_name": "인증번호",
        "description": "6자리 인증번호 (숫자)",
        "sample": "123456",
        "maxLen": 6
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "ACC_EMAIL_EXISTS": {
    "id": "ACC_EMAIL_EXISTS",
    "name": "이미 가입된 이메일 안내",
    "recipient": "mem",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 이미 가입된 이메일입니다",
      "preheader": "방금 이 주소로 회원 가입이 시도되었습니다. 이미 계정이 있어 새로 만들지 않았고, 로그인 방법을 안내드립니다.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "RESET_URL",
        "kr_name": "재설정URL",
        "description": "비밀번호 재설정 링크 (1회용 토큰 포함)",
        "sample": "https://micego.example/ko/reset.html?k=demo-reset-token",
        "maxLen": 90
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "LOGIN_URL",
        "kr_name": "로그인URL",
        "description": "회원 로그인 페이지 링크",
        "sample": "https://micego.example/ko/login.html",
        "maxLen": 60
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "ACC_WELCOME": {
    "id": "ACC_WELCOME",
    "name": "가입 완료 안내",
    "recipient": "mem",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": true,
      "lms": true,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 회원 가입을 마쳤습니다",
      "preheader": "{{CONTACT_NAME}}님, 가입해 주셔서 감사합니다. 이제 견적 요청을 「내 견적 요청」에서 한곳에 볼 수 있습니다.",
      "cc": "",
      "optional_blocks": []
    },
    "alimtalk": {
      "code": "micego_acc_welcome",
      "body": "[MICEGO] 회원 가입을 마쳤습니다.\n\n{{CONTACT_NAME}}님, 가입해 주셔서 감사합니다. 이제 견적 요청 현황을 「내 견적 요청」에서 한곳에 확인하실 수 있습니다.\n\n■ 연결한 이전 요청: {{LINKED_COUNT}}건\n\n동료에게는 요청별 보기 전용 링크를 보내 함께 볼 수 있습니다. 제안 선택은 요청하신 분만 할 수 있습니다.\n\n※ 이 메시지는 MICEGO 회원 가입을 마치신 분께 발송되는 안내입니다.",
      "buttons": [
        {
          "name": "내 견적 요청 보기",
          "url": "https://micego.example/ko/my.html"
        }
      ],
      "fallback_title": "[MICEGO] 회원 가입 완료",
      "fallback_body": "[MICEGO] 회원 가입을 마쳤습니다.\n\n{{CONTACT_NAME}}님, 가입해 주셔서 감사합니다. 이제 견적 요청 현황을 「내 견적 요청」에서 한곳에 확인하실 수 있습니다.\n\n■ 연결한 이전 요청: {{LINKED_COUNT}}건\n\n동료에게는 요청별 보기 전용 링크를 보내 함께 볼 수 있습니다. 제안 선택은 요청하신 분만 할 수 있습니다.\n\n▶ 내 견적 요청: https://micego.example/ko/my.html\n\n※ 이 메시지는 MICEGO 회원 가입을 마치신 분께 발송되는 안내입니다."
    },
    "variables": [
      {
        "key": "CONTACT_NAME",
        "kr_name": "가입자명",
        "description": "회원 이름",
        "sample": "김지은",
        "maxLen": 20
      },
      {
        "key": "LINKED_COUNT",
        "kr_name": "연결건수",
        "description": "계정에 연결한 이전 요청 수",
        "sample": "1",
        "maxLen": 2
      },
      {
        "key": "MY_URL",
        "kr_name": "내요청URL",
        "description": "내 견적 요청 페이지 링크",
        "sample": "https://micego.example/ko/my.html",
        "maxLen": 60
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "ACC_LINKED": {
    "id": "ACC_LINKED",
    "name": "이전 요청 연결 안내",
    "recipient": "mem",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 이전 요청을 계정에 연결했습니다",
      "preheader": "비회원으로 접수하신 요청 {{LINKED_COUNT}}건이 「내 견적 요청」에 추가되었습니다. 요청번호를 확인해 주세요.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "LINKED_COUNT",
        "kr_name": "연결건수",
        "description": "계정에 연결한 이전 요청 수",
        "sample": "1",
        "maxLen": 2
      },
      {
        "key": "RFP_REFS",
        "kr_name": "연결요청번호",
        "description": "연결한 요청번호 목록 (줄바꿈으로 구분)",
        "sample": "MG-2609-011",
        "maxLen": 60
      },
      {
        "key": "MY_URL",
        "kr_name": "내요청URL",
        "description": "내 견적 요청 페이지 링크",
        "sample": "https://micego.example/ko/my.html",
        "maxLen": 60
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "ACC_PW_RESET": {
    "id": "ACC_PW_RESET",
    "name": "비밀번호 재설정 링크",
    "recipient": "mem",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 비밀번호 재설정 링크를 보내드립니다",
      "preheader": "아래 버튼으로 새 비밀번호를 정해 주세요. 링크는 {{EXPIRES_MIN}}분 동안 한 번만 쓸 수 있습니다.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "EXPIRES_MIN",
        "kr_name": "유효시간",
        "description": "인증번호·링크 유효 시간 (분)",
        "sample": "30",
        "maxLen": 2
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "RESET_URL",
        "kr_name": "재설정URL",
        "description": "비밀번호 재설정 링크 (1회용 토큰 포함)",
        "sample": "https://micego.example/ko/reset.html?k=demo-reset-token",
        "maxLen": 90
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "ACC_PW_CHANGED": {
    "id": "ACC_PW_CHANGED",
    "name": "비밀번호 변경 완료",
    "recipient": "mem",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 비밀번호가 변경되었습니다",
      "preheader": "{{CHANGED_AT}}에 계정 비밀번호가 바뀌었고 다른 기기는 모두 로그아웃되었습니다. 본인이 아니라면 바로 확인해 주세요.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "CHANGED_AT",
        "kr_name": "변경일시",
        "description": "변경·처리 시각 (KST)",
        "sample": "2026-10-08 19:30",
        "maxLen": 16
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "RESET_URL",
        "kr_name": "재설정URL",
        "description": "비밀번호 재설정 링크 (1회용 토큰 포함)",
        "sample": "https://micego.example/ko/reset.html?k=demo-reset-token",
        "maxLen": 90
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "ACC_EMAIL_CHANGED": {
    "id": "ACC_EMAIL_CHANGED",
    "name": "이메일 변경 완료 (이전 주소)",
    "recipient": "mem",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 로그인 이메일이 변경되었습니다",
      "preheader": "이 계정의 로그인 이메일이 {{NEW_EMAIL_MASKED}}(으)로 바뀌었습니다. 본인이 아니라면 바로 알려 주세요.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "NEW_EMAIL_MASKED",
        "kr_name": "새이메일",
        "description": "마스킹한 새 로그인 이메일",
        "sample": "ha****@hanbit-tour.example",
        "maxLen": 40
      },
      {
        "key": "CHANGED_AT",
        "kr_name": "변경일시",
        "description": "변경·처리 시각 (KST)",
        "sample": "2026-10-08 19:30",
        "maxLen": 16
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "ACC_PHONE_CHANGED": {
    "id": "ACC_PHONE_CHANGED",
    "name": "휴대전화 변경 완료",
    "recipient": "mem",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 휴대전화 번호가 변경되었습니다",
      "preheader": "계정의 휴대전화가 {{NEW_PHONE_MASKED}}(으)로 바뀌었습니다. 본인이 아니라면 바로 알려 주세요.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "NEW_PHONE_MASKED",
        "kr_name": "새번호",
        "description": "마스킹한 새 휴대전화 (가운데 4자리 가림)",
        "sample": "010-****-5678",
        "maxLen": 13
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "CHANGED_AT",
        "kr_name": "변경일시",
        "description": "변경·처리 시각 (KST)",
        "sample": "2026-10-08 19:30",
        "maxLen": 16
      },
      {
        "key": "RESET_URL",
        "kr_name": "재설정URL",
        "description": "비밀번호 재설정 링크 (1회용 토큰 포함)",
        "sample": "https://micego.example/ko/reset.html?k=demo-reset-token",
        "maxLen": 90
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "ACC_LOCKED": {
    "id": "ACC_LOCKED",
    "name": "계정 잠금 안내",
    "recipient": "mem",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 로그인 실패가 반복되어 계정을 잠갔습니다",
      "preheader": "{{LOCKED_AT}}에 로그인 실패가 10회 이어져 계정을 보호하려고 잠갔습니다. 비밀번호를 재설정하면 풀립니다.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "LOCKED_AT",
        "kr_name": "잠금일시",
        "description": "계정 잠금 시각 (KST)",
        "sample": "2026-10-08 17:42",
        "maxLen": 16
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "RESET_URL",
        "kr_name": "재설정URL",
        "description": "비밀번호 재설정 링크 (1회용 토큰 포함)",
        "sample": "https://micego.example/ko/reset.html?k=demo-reset-token",
        "maxLen": 90
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "ACC_WITHDRAWN": {
    "id": "ACC_WITHDRAWN",
    "name": "탈퇴 완료 안내",
    "recipient": "mem",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 회원 탈퇴를 마쳤습니다",
      "preheader": "계정과 연락처를 파기하고 공유 링크를 모두 중지했습니다. 성사 기록은 3년간 보관합니다.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "WITHDRAWN_AT",
        "kr_name": "탈퇴일시",
        "description": "탈퇴 처리 시각 (KST)",
        "sample": "2026-10-08 19:30",
        "maxLen": 16
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "FB_OPS_ALERT": {
    "id": "FB_OPS_ALERT",
    "name": "피드백 운영 알림",
    "recipient": "fbk",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO 피드백] {{FB_REF}} · {{FB_CATEGORY}} · {{FB_USER_TYPE}}",
      "preheader": "{{FB_PAGE}} · 이 메일에 답장하면 접수자에게 바로 전달됩니다.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "FB_REF",
        "kr_name": "접수번호",
        "description": "피드백 접수번호 (FB-YYMMDD-XXXX, KST 날짜)",
        "sample": "FB-261008-7KQ3",
        "maxLen": 16
      },
      {
        "key": "FB_CATEGORY",
        "kr_name": "피드백유형",
        "description": "대분류 라벨 (화면·기능 문제 / 견적·운영 문의 / 기타)",
        "sample": "화면·기능 문제",
        "maxLen": 20
      },
      {
        "key": "FB_USER_TYPE",
        "kr_name": "보낸사람",
        "description": "유저 유형 라벨 (여행사 회원 · 비회원 요청자 · 호텔 · 운영자 · 방문자)",
        "sample": "비회원 요청자",
        "maxLen": 12
      },
      {
        "key": "FB_PAGE",
        "kr_name": "페이지",
        "description": "page_path · 화면 상태",
        "sample": "/ko/track.html · delivered",
        "maxLen": 60
      },
      {
        "key": "FB_RECEIVED_AT",
        "kr_name": "접수시각",
        "description": "접수 시각 (KST)",
        "sample": "2026-10-08 19:30",
        "maxLen": 16
      },
      {
        "key": "FB_REPLY_EMAIL",
        "kr_name": "회신주소",
        "description": "접수자가 남긴 회신 이메일 (없으면 '회신 없음')",
        "sample": "jieun.kim@hanbit-tour.example",
        "maxLen": 60
      },
      {
        "key": "FB_UA",
        "kr_name": "브라우저",
        "description": "OS · 브라우저 · 인앱 요약",
        "sample": "Android 14 · Chrome 128 · KakaoTalk",
        "maxLen": 60
      },
      {
        "key": "FB_CONTENT",
        "kr_name": "내용",
        "description": "접수자가 쓴 본문 (원문, 이스케이프)",
        "sample": "비교표에서 제안 B의 취소 규정이 두 줄로 겹쳐 보입니다. 갤럭시 S24, 카카오톡에서 열었습니다.",
        "maxLen": 2000
      },
      {
        "key": "FB_CONSOLE_URL",
        "kr_name": "콘솔링크",
        "description": "운영 콘솔 상세 URL",
        "sample": "https://micego.example/admin/feedback-detail.html?id=…",
        "maxLen": 120
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "FB_ACK": {
    "id": "FB_ACK",
    "name": "피드백 접수 확인",
    "recipient": "fbk",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": true,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "email": {
      "subject": "[MICEGO] 보내 주신 의견을 접수했습니다 ({{FB_REF}})",
      "preheader": "접수번호 {{FB_REF}} · 답변이 필요한 내용이면 이 주소로 회신드립니다.",
      "cc": "",
      "optional_blocks": []
    },
    "variables": [
      {
        "key": "FB_REF",
        "kr_name": "접수번호",
        "description": "피드백 접수번호 (FB-YYMMDD-XXXX, KST 날짜)",
        "sample": "FB-261008-7KQ3",
        "maxLen": 16
      },
      {
        "key": "FB_CATEGORY",
        "kr_name": "피드백유형",
        "description": "대분류 라벨 (화면·기능 문제 / 견적·운영 문의 / 기타)",
        "sample": "화면·기능 문제",
        "maxLen": 20
      },
      {
        "key": "FB_RECEIVED_AT",
        "kr_name": "접수시각",
        "description": "접수 시각 (KST)",
        "sample": "2026-10-08 19:30",
        "maxLen": 16
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      },
      {
        "key": "FROM_ADDRESS",
        "kr_name": "발신주소",
        "description": "발신 주소 (Resend 인증 도메인, 미확정)",
        "sample": "notify@micego.example",
        "maxLen": 40
      }
    ]
  },
  "ACC_SMS_OTP": {
    "id": "ACC_SMS_OTP",
    "name": "휴대전화 인증번호 (문자)",
    "recipient": "mem",
    "mode": "auto",
    "language": "ko",
    "channels": {
      "email": false,
      "alimtalk": false,
      "lms": false,
      "sms": true
    },
    "sms": {
      "body": "[MICEGO] 인증번호 [{{CODE}}]를 {{EXPIRES_MIN}}분 안에 입력해 주세요. 타인에게 알려주지 마세요.",
      "limit_bytes": 90
    },
    "variables": [
      {
        "key": "CODE",
        "kr_name": "인증번호",
        "description": "6자리 인증번호 (숫자)",
        "sample": "123456",
        "maxLen": 6
      },
      {
        "key": "EXPIRES_MIN",
        "kr_name": "유효시간",
        "description": "인증번호·링크 유효 시간 (분)",
        "sample": "3",
        "maxLen": 2
      }
    ]
  },
  "OPS_ORG_PROGRESS": {
    "id": "OPS_ORG_PROGRESS",
    "name": "진행 상황 회신 (SLA)",
    "recipient": "ops",
    "mode": "manual",
    "language": "ko",
    "channels": {
      "email": false,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "ORG_CONTACT_NAME",
        "kr_name": "담당자명",
        "description": "오거나이저 담당자 이름·직함",
        "sample": "김지은 과장",
        "maxLen": 20
      },
      {
        "key": "DESTINATION",
        "kr_name": "목적지",
        "description": "행사 목적지",
        "sample": "다낭",
        "maxLen": 20
      },
      {
        "key": "EVENT_TYPE",
        "kr_name": "행사유형",
        "description": "행사 유형",
        "sample": "인센티브",
        "maxLen": 12
      },
      {
        "key": "CURRENT_STEP",
        "kr_name": "현재단계",
        "description": "현재 진행 단계",
        "sample": "호텔 견적 취합 중",
        "maxLen": 30
      },
      {
        "key": "PROGRESS_NOTE",
        "kr_name": "진행내용",
        "description": "지금까지 한 일 한두 문장",
        "sample": "조건에 맞는 호텔에 요청을 보냈고, 마감까지 제안을 받고 있습니다.",
        "maxLen": 100
      },
      {
        "key": "NEXT_DATE",
        "kr_name": "다음일정",
        "description": "다음 안내 예정일",
        "sample": "2026-10-12(월)",
        "maxLen": 14
      },
      {
        "key": "NEXT_ACTION",
        "kr_name": "다음조치",
        "description": "그날 하는 일",
        "sample": "비교표를 전달드리겠습니다",
        "maxLen": 40
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      }
    ]
  },
  "OPS_ORG_INFO": {
    "id": "OPS_ORG_INFO",
    "name": "정보 보완 요청",
    "recipient": "ops",
    "mode": "manual",
    "language": "ko",
    "channels": {
      "email": false,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "ORG_CONTACT_NAME",
        "kr_name": "담당자명",
        "description": "오거나이저 담당자 이름·직함",
        "sample": "김지은 과장",
        "maxLen": 20
      },
      {
        "key": "MISSING_ITEMS",
        "kr_name": "확인항목",
        "description": "확인이 필요한 항목 목록",
        "sample": "- 트윈·킹 객실 수\n- 연회장 사용 여부와 목적",
        "maxLen": 120
      },
      {
        "key": "REPLY_BY",
        "kr_name": "회신기한",
        "description": "회신 요청 기한",
        "sample": "2026-10-01(목) 18:00",
        "maxLen": 24
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      }
    ]
  },
  "OPS_ORG_DATE": {
    "id": "OPS_ORG_DATE",
    "name": "일정 확정 확인",
    "recipient": "ops",
    "mode": "manual",
    "language": "ko",
    "channels": {
      "email": false,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "ORG_CONTACT_NAME",
        "kr_name": "담당자명",
        "description": "오거나이저 담당자 이름·직함",
        "sample": "김지은 과장",
        "maxLen": 20
      },
      {
        "key": "DATE_ASKED",
        "kr_name": "확인일정",
        "description": "확정 여부를 묻는 일정 표기",
        "sample": "2027-03-15~18",
        "maxLen": 20
      },
      {
        "key": "REPLY_BY",
        "kr_name": "회신기한",
        "description": "회신 요청 기한",
        "sample": "2026-10-01(목) 18:00",
        "maxLen": 24
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      }
    ]
  },
  "OPS_ORG_NOQUOTE": {
    "id": "OPS_ORG_NOQUOTE",
    "name": "취합중 0건 현황 + 재요청 예정일",
    "recipient": "ops",
    "mode": "manual",
    "language": "ko",
    "channels": {
      "email": false,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "ORG_CONTACT_NAME",
        "kr_name": "담당자명",
        "description": "오거나이저 담당자 이름·직함",
        "sample": "김지은 과장",
        "maxLen": 20
      },
      {
        "key": "DEADLINE_KST",
        "kr_name": "견적마감",
        "description": "호텔 견적 마감 (KST)",
        "sample": "2026-10-08(목) 18:00 KST",
        "maxLen": 26
      },
      {
        "key": "REBID_DATE",
        "kr_name": "재요청예정일",
        "description": "다른 호텔로 다시 요청할 예정일",
        "sample": "2026-10-13(화)",
        "maxLen": 14
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      }
    ]
  },
  "OPS_ORG_CLOSE_CHECK": {
    "id": "OPS_ORG_CLOSE_CHECK",
    "name": "미성사 닫기 전 확인",
    "recipient": "ops",
    "mode": "manual",
    "language": "ko",
    "channels": {
      "email": false,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "ORG_CONTACT_NAME",
        "kr_name": "담당자명",
        "description": "오거나이저 담당자 이름·직함",
        "sample": "김지은 과장",
        "maxLen": 20
      },
      {
        "key": "VALID_UNTIL_MIN",
        "kr_name": "유효기한",
        "description": "제안 중 가장 빠른 견적 유효기한",
        "sample": "2026-12-15",
        "maxLen": 10
      },
      {
        "key": "REPLY_BY",
        "kr_name": "회신기한",
        "description": "회신 요청 기한",
        "sample": "2026-10-01(목) 18:00",
        "maxLen": 24
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      }
    ]
  },
  "OPS_ORG_FEW_HOTELS": {
    "id": "OPS_ORG_FEW_HOTELS",
    "name": "초대 가능 호텔 2곳 미만 사전 안내",
    "recipient": "ops",
    "mode": "manual",
    "language": "ko",
    "channels": {
      "email": false,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "ORG_CONTACT_NAME",
        "kr_name": "담당자명",
        "description": "오거나이저 담당자 이름·직함",
        "sample": "김지은 과장",
        "maxLen": 20
      },
      {
        "key": "OPTION_NOTE",
        "kr_name": "조정방안",
        "description": "조건을 조정할 수 있는 항목",
        "sample": "행사 규모나 일정을 유연하게 조정하시면 요청을 보낼 수 있는 호텔이 늘어납니다.",
        "maxLen": 100
      },
      {
        "key": "REPLY_BY",
        "kr_name": "회신기한",
        "description": "회신 요청 기한",
        "sample": "2026-10-01(목) 18:00",
        "maxLen": 24
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      }
    ]
  },
  "OPS_ORG_ANON_INCIDENT": {
    "id": "OPS_ORG_ANON_INCIDENT",
    "name": "익명화 누락 고지",
    "recipient": "ops",
    "mode": "manual",
    "language": "ko",
    "channels": {
      "email": false,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "ORG_CONTACT_NAME",
        "kr_name": "담당자명",
        "description": "오거나이저 담당자 이름·직함",
        "sample": "김지은 과장",
        "maxLen": 20
      },
      {
        "key": "INCIDENT_FACT",
        "kr_name": "노출사실",
        "description": "무엇이 어떻게 노출됐는지",
        "sample": "호텔에 공개되는 요건서 메모에 회사명이 한 차례 기재되어 있었습니다.",
        "maxLen": 100
      },
      {
        "key": "INCIDENT_SCOPE",
        "kr_name": "노출범위",
        "description": "노출 시각·열람한 호텔 범위",
        "sample": "2026-09-30 11:20부터 14:05까지, 그 사이 요건서를 연 호텔은 1곳입니다.",
        "maxLen": 100
      },
      {
        "key": "INCIDENT_ACTION",
        "kr_name": "조치내용",
        "description": "수정·재발 방지 조치",
        "sample": "메모를 수정해 회사명을 삭제했고, 공개 메모 검토 절차를 한 단계 늘렸습니다.",
        "maxLen": 100
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      }
    ]
  },
  "OPS_HTL_FOLLOWUP": {
    "id": "OPS_HTL_FOLLOWUP",
    "name": "Deadline follow-up (no reply)",
    "recipient": "ops",
    "mode": "manual",
    "language": "en",
    "channels": {
      "email": false,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "HOTEL_CONTACT_NAME",
        "kr_name": "호텔담당자",
        "description": "호텔 담당자 이름",
        "sample": "Ms. Linh",
        "maxLen": 30
      },
      {
        "key": "DESTINATION",
        "kr_name": "목적지",
        "description": "행사 목적지",
        "sample": "Da Nang, Vietnam",
        "maxLen": 20
      },
      {
        "key": "PAX",
        "kr_name": "인원",
        "description": "예상 인원",
        "sample": "150–199 attendees",
        "maxLen": 14
      },
      {
        "key": "EVENT_DATES",
        "kr_name": "행사일정",
        "description": "행사 기간",
        "sample": "Mon 15 – Thu 18 Mar 2027 (3 nights)",
        "maxLen": 20
      },
      {
        "key": "DEADLINE_KST",
        "kr_name": "견적마감",
        "description": "호텔 견적 마감 (KST)",
        "sample": "Thu 8 Oct 2026, 18:00 KST",
        "maxLen": 26
      },
      {
        "key": "HOTEL_NAME",
        "kr_name": "호텔명",
        "description": "수신 호텔(숙박시설)명",
        "sample": "Ocean Pearl Resort Da Nang",
        "maxLen": 50
      },
      {
        "key": "HOTEL_BID_URL",
        "kr_name": "호텔링크",
        "description": "호텔 개인 견적 링크 전체",
        "sample": "https://micego.example/en/bid.html?t=demo-2610",
        "maxLen": 90
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      }
    ]
  },
  "OPS_HTL_QUOTE_CHECK": {
    "id": "OPS_HTL_QUOTE_CHECK",
    "name": "Quote check (blank fields / outliers)",
    "recipient": "ops",
    "mode": "manual",
    "language": "en",
    "channels": {
      "email": false,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "HOTEL_CONTACT_NAME",
        "kr_name": "호텔담당자",
        "description": "호텔 담당자 이름",
        "sample": "Ms. Linh",
        "maxLen": 30
      },
      {
        "key": "QUOTE_ISSUES",
        "kr_name": "확인사항",
        "description": "견적에서 확인할 항목 목록",
        "sample": "- Twin rate is higher than the King rate\n- Validity ends before the event dates (15 Mar 2027)",
        "maxLen": 200
      },
      {
        "key": "REPLY_BY",
        "kr_name": "회신기한",
        "description": "회신 요청 기한",
        "sample": "Tue 6 Oct 2026, 18:00 KST",
        "maxLen": 24
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      }
    ]
  },
  "OPS_HTL_CANCELLED": {
    "id": "OPS_HTL_CANCELLED",
    "name": "Request cancelled (during bidding)",
    "recipient": "ops",
    "mode": "manual",
    "language": "en",
    "channels": {
      "email": false,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "HOTEL_CONTACT_NAME",
        "kr_name": "호텔담당자",
        "description": "호텔 담당자 이름",
        "sample": "Ms. Linh",
        "maxLen": 30
      },
      {
        "key": "DESTINATION",
        "kr_name": "목적지",
        "description": "행사 목적지",
        "sample": "Da Nang, Vietnam",
        "maxLen": 20
      },
      {
        "key": "EVENT_DATES",
        "kr_name": "행사일정",
        "description": "행사 기간",
        "sample": "Mon 15 – Thu 18 Mar 2027 (3 nights)",
        "maxLen": 20
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      }
    ]
  },
  "OPS_PTN_SUSPEND": {
    "id": "OPS_PTN_SUSPEND",
    "name": "Listing paused + how to reinstate",
    "recipient": "ops",
    "mode": "manual",
    "language": "en",
    "channels": {
      "email": false,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "variables": [
      {
        "key": "PARTNER_ID",
        "kr_name": "신청번호",
        "description": "파트너 신청 번호",
        "sample": "PT-2609-007",
        "maxLen": 12
      },
      {
        "key": "APPLICANT_NAME",
        "kr_name": "신청자",
        "description": "파트너 신청 담당자 이름",
        "sample": "Putri Wijaya",
        "maxLen": 30
      },
      {
        "key": "PROPERTY_NAME",
        "kr_name": "시설명",
        "description": "파트너 신청 숙박시설명",
        "sample": "Sanur Lagoon Resort",
        "maxLen": 50
      },
      {
        "key": "SUSPEND_REASON",
        "kr_name": "중지사유",
        "description": "중지 사유",
        "sample": "the last three invitations went unanswered",
        "maxLen": 80
      },
      {
        "key": "HOTEL_CONTACT_EMAIL",
        "kr_name": "호텔이메일",
        "description": "호텔 담당자 이메일 (수신 주소)",
        "sample": "sales@oceanpearl.example",
        "maxLen": 50
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      }
    ]
  },
  "OPS_PTN_DOMAIN_CHECK": {
    "id": "OPS_PTN_DOMAIN_CHECK",
    "name": "Affiliation check (personal email)",
    "recipient": "ops",
    "mode": "manual",
    "language": "en",
    "channels": {
      "email": false,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "variables": [
      {
        "key": "PARTNER_ID",
        "kr_name": "신청번호",
        "description": "파트너 신청 번호",
        "sample": "PT-2609-007",
        "maxLen": 12
      },
      {
        "key": "APPLICANT_NAME",
        "kr_name": "신청자",
        "description": "파트너 신청 담당자 이름",
        "sample": "Putri Wijaya",
        "maxLen": 30
      },
      {
        "key": "PROPERTY_NAME",
        "kr_name": "시설명",
        "description": "파트너 신청 숙박시설명",
        "sample": "Sanur Lagoon Resort",
        "maxLen": 50
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      }
    ]
  },
  "OPS_ACC_LINK": {
    "id": "OPS_ACC_LINK",
    "name": "회원 연결 요청 확인 (휴대전화 일치)",
    "recipient": "ops",
    "mode": "manual",
    "language": "ko",
    "channels": {
      "email": false,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "CONTACT_NAME",
        "kr_name": "가입자명",
        "description": "회원 이름",
        "sample": "김지은",
        "maxLen": 20
      },
      {
        "key": "MEMBER_EMAIL",
        "kr_name": "회원이메일",
        "description": "회원 로그인 이메일 (운영자 화면 기준)",
        "sample": "jieun.kim@hanbit-tour.example",
        "maxLen": 50
      },
      {
        "key": "REPLY_BY",
        "kr_name": "회신기한",
        "description": "회신 요청 기한",
        "sample": "2026-10-01(목) 18:00",
        "maxLen": 24
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      }
    ]
  },
  "OPS_RFP_TRANSFER": {
    "id": "OPS_RFP_TRANSFER",
    "name": "요청 이관 안내 (양쪽 회원)",
    "recipient": "ops",
    "mode": "manual",
    "language": "ko",
    "channels": {
      "email": false,
      "alimtalk": false,
      "lms": false,
      "sms": false
    },
    "variables": [
      {
        "key": "RFP_ID",
        "kr_name": "요청번호",
        "description": "견적 요청 번호",
        "sample": "MG-2610-014",
        "maxLen": 12
      },
      {
        "key": "FROM_NAME",
        "kr_name": "이전담당자",
        "description": "요청을 넘기는 회원 (이름과 회사)",
        "sample": "김지은 (한빛투어)",
        "maxLen": 30
      },
      {
        "key": "TO_NAME",
        "kr_name": "새담당자",
        "description": "요청을 받는 회원 (이름과 회사)",
        "sample": "이서준 (한빛투어)",
        "maxLen": 30
      },
      {
        "key": "SUPPORT_EMAIL",
        "kr_name": "문의메일",
        "description": "문의 수신 주소 (운영 메일, 미확정)",
        "sample": "mysteri1984@gmail.com",
        "maxLen": 40
      }
    ]
  }
};

export const EMAIL_HTML: Record<string, string> = {"ORG_RECEIVED": "<!DOCTYPE html>\n<!--\nMICEGO email template: ORG_RECEIVED (접수 확인)\nSubject: [MICEGO] 견적 요청이 접수되었습니다 · {{RFP_ID}}\nPreheader: 요청번호 {{RFP_ID}} · {{DESTINATION}} {{EVENT_TYPE}} · 3영업일 안에 진행 상황을 알려 드립니다.\nTrigger: #0 접수 폼 제출 → 접수됨\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{RFP_ID}}, {{DESTINATION}}, {{EVENT_TYPE}}, {{ORG_CONTACT_NAME}}, {{RECEIVED_AT}}, {{PAX}}, {{PARTNER_PUBLIC_NAME}}, {{TRACK_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 견적 요청이 접수되었습니다 · {{RFP_ID}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">요청번호 {{RFP_ID}} · {{DESTINATION}} {{EVENT_TYPE}} · 3영업일 안에 진행 상황을 알려 드립니다.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">견적 요청</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#E3F5F2;color:#076B64;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">접수됨</span>&nbsp;&nbsp;REF {{RFP_ID}}</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">견적 요청이 접수되었습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">{{ORG_CONTACT_NAME}}님, 요청해 주셔서 감사합니다. 아래 내용으로 접수했습니다. 진행 상황은 개인 링크에서 언제든 확인하실 수 있습니다.</div>\n</td></tr></table>\n<!-- OPTIONAL BLOCK START: REGIONAL_PARTNER. Include only when rfps.delegation = delegated (지역 운영 파트너 위임 건 — 결정 2026-09-27 고지) -->\n<!-- F. Callout (gray) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#EEF2F8\" style=\"background-color:#EEF2F8;border-radius:8px;\"><tr><td bgcolor=\"#EEF2F8\" style=\"padding:14px 18px;border-left:3px solid #8B97B5;background-color:#EEF2F8;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">현지 운영 파트너가 함께 진행합니다</div><div style=\"font-size:13px;line-height:1.6;color:#3F4C6B;padding-top:4px;\">이 요청은 MICEGO의 현지 운영 파트너 &lt;b&gt;{{PARTNER_PUBLIC_NAME}}&lt;/b&gt;이(가) 호텔 섭외와 견적 취합을 맡아 진행합니다. 요청 내용과 담당자 연락처는 이 목적으로만 쓰이며, 파트너는 MICEGO와 같은 보호 의무를 집니다. 자세한 내용은 개인정보처리방침 제8조를 확인해 주세요.</div></td></tr></table></td></tr></table>\n<!-- OPTIONAL BLOCK END: REGIONAL_PARTNER -->\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">요청번호</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{RFP_ID}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">접수일시</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{RECEIVED_AT}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">목적지</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{DESTINATION}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">행사 유형</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{EVENT_TYPE}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">예상 인원</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{PAX}}</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (amber) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FFF3D6\" style=\"background-color:#FFF3D6;border-radius:8px;\"><tr><td bgcolor=\"#FFF3D6\" style=\"padding:14px 18px;border-left:3px solid #FFC24B;background-color:#FFF3D6;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">3영업일 안에 진행 상황을 알려 드립니다</div><div style=\"font-size:13px;line-height:1.6;color:#7A4E00;padding-top:4px;\">접수된 영업일에 확인을 시작해 3영업일 안에 진행 상황과 다음 일정을 알려 드립니다.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{TRACK_URL}}\" style=\"height:52px;v-text-anchor:middle;width:300px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">진행 상황 보기</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{TRACK_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">진행 상황 보기</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">개인 링크입니다. 로그인 없이 열리니 외부에 전달하지 말아 주세요.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">호텔에 전달되는 요건서에는 회사명과 예산이 포함되지 않습니다. 주최 측 수수료는 없습니다.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO에 견적을 요청하신 분께 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ORG_REJECTED": "<!DOCTYPE html>\n<!--\nMICEGO email template: ORG_REJECTED (반려 안내)\nSubject: [MICEGO] 이번 요청은 진행하기 어렵습니다 · {{RFP_ID}}\nPreheader: 요청번호 {{RFP_ID}} · 사유를 안내드립니다. 조건이 갖춰지면 새로 요청해 주세요.\nTrigger: #2 검증중 → 반려됨\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{RFP_ID}}, {{ORG_CONTACT_NAME}}, {{RECEIVED_AT}}, {{DESTINATION}}, {{REJECT_REASON}}, {{REGISTER_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 이번 요청은 진행하기 어렵습니다 · {{RFP_ID}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">요청번호 {{RFP_ID}} · 사유를 안내드립니다. 조건이 갖춰지면 새로 요청해 주세요.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">견적 요청</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#FBE9E9;color:#9B2C2C;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">반려됨</span>&nbsp;&nbsp;REF {{RFP_ID}}</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">이번 요청은 진행하기 어렵습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">{{ORG_CONTACT_NAME}}님, 요청 내용을 검토했지만 이번에는 호텔에 요청을 보내지 못했습니다. 사유를 아래에 적었습니다.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">요청번호</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{RFP_ID}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">접수일시</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{RECEIVED_AT}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">목적지</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{DESTINATION}}</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (red) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FBEAEA\" style=\"background-color:#FBEAEA;border-radius:8px;\"><tr><td bgcolor=\"#FBEAEA\" style=\"padding:14px 18px;border-left:3px solid #D08A8A;background-color:#FBEAEA;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#7A1F1F;\">반려 사유</div><div style=\"font-size:13px;line-height:1.6;color:#8F3535;padding-top:4px;\">{{REJECT_REASON}}</div></td></tr></table></td></tr></table>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:20px 32px 0;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.7;color:#4A5D8C;\">사유가 해결되면 새로 요청해 주세요. 접수된 내용은 호텔에 전달되지 않았습니다.</td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{REGISTER_URL}}\" style=\"height:52px;v-text-anchor:middle;width:300px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">새로 요청하기</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{REGISTER_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">새로 요청하기</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">호텔에 전달되는 요건서에는 회사명과 예산이 포함되지 않습니다. 주최 측 수수료는 없습니다.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO에 견적을 요청하신 분께 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ORG_BIDDING": "<!DOCTYPE html>\n<!--\nMICEGO email template: ORG_BIDDING (비딩중 진입)\nSubject: [MICEGO] 호텔에 견적을 요청했습니다 · {{RFP_ID}}\nPreheader: 요청번호 {{RFP_ID}} · 견적 마감 {{DEADLINE_KST}} · 비교표는 {{COMPARE_DATE}}까지 전달합니다.\nTrigger: #4 오픈 → 비딩중 (초대 발송 시점)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{RFP_ID}}, {{DEADLINE_KST}}, {{COMPARE_DATE}}, {{ORG_CONTACT_NAME}}, {{DESTINATION}}, {{EVENT_TYPE}}, {{PAX}}, {{EVENT_DATES}}, {{PARTNER_PUBLIC_NAME}}, {{TRACK_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 호텔에 견적을 요청했습니다 · {{RFP_ID}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">요청번호 {{RFP_ID}} · 견적 마감 {{DEADLINE_KST}} · 비교표는 {{COMPARE_DATE}}까지 전달합니다.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">견적 요청</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#E3F5F2;color:#076B64;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">비딩중</span>&nbsp;&nbsp;REF {{RFP_ID}}</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">조건에 맞는 호텔에 요청을 보냈습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">{{ORG_CONTACT_NAME}}님, 검토를 마치고 조건에 맞는 해외 호텔 몇 곳에 요청을 보냈습니다. 호텔이 견적을 내는 동안 따로 하실 일은 없습니다.</div>\n</td></tr></table>\n<!-- OPTIONAL BLOCK START: REGIONAL_PARTNER. Include only when rfps.delegation = delegated (지역 운영 파트너 위임 건 — 결정 2026-09-27 고지) -->\n<!-- F. Callout (gray) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#EEF2F8\" style=\"background-color:#EEF2F8;border-radius:8px;\"><tr><td bgcolor=\"#EEF2F8\" style=\"padding:14px 18px;border-left:3px solid #8B97B5;background-color:#EEF2F8;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">현지 운영 파트너가 함께 진행합니다</div><div style=\"font-size:13px;line-height:1.6;color:#3F4C6B;padding-top:4px;\">이 요청은 MICEGO의 현지 운영 파트너 &lt;b&gt;{{PARTNER_PUBLIC_NAME}}&lt;/b&gt;이(가) 호텔 섭외와 견적 취합을 맡아 진행합니다. 요청 내용과 담당자 연락처는 이 목적으로만 쓰이며, 파트너는 MICEGO와 같은 보호 의무를 집니다. 자세한 내용은 개인정보처리방침 제8조를 확인해 주세요.</div></td></tr></table></td></tr></table>\n<!-- OPTIONAL BLOCK END: REGIONAL_PARTNER -->\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">행사</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{DESTINATION}} {{EVENT_TYPE}} · {{PAX}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">행사 일정</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{EVENT_DATES}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">호텔 견적 마감</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{DEADLINE_KST}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">비교표 전달 예정</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{COMPARE_DATE}}</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (amber) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FFF3D6\" style=\"background-color:#FFF3D6;border-radius:8px;\"><tr><td bgcolor=\"#FFF3D6\" style=\"padding:14px 18px;border-left:3px solid #FFC24B;background-color:#FFF3D6;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">마감 후 비교표를 전달합니다</div><div style=\"font-size:13px;line-height:1.6;color:#7A4E00;padding-top:4px;\">마감 후 받은 제안을 비교표로 정리해 {{COMPARE_DATE}}까지 전달합니다. 제안이 도착하면 다시 알려 드립니다.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{TRACK_URL}}\" style=\"height:52px;v-text-anchor:middle;width:300px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">진행 상황 보기</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{TRACK_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">진행 상황 보기</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">개인 링크입니다. 로그인 없이 열리니 외부에 전달하지 말아 주세요.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">호텔에 전달되는 요건서에는 회사명과 예산이 포함되지 않습니다. 주최 측 수수료는 없습니다.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO에 견적을 요청하신 분께 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ORG_REBID": "<!DOCTYPE html>\n<!--\nMICEGO email template: ORG_REBID (새 라운드 (조건 변경))\nSubject: [MICEGO] 바뀐 조건으로 호텔에 다시 요청했습니다 · {{RFP_ID}}\nPreheader: 요청번호 {{RFP_ID}} · 새 견적 마감 {{DEADLINE_KST}} · 비교표는 {{COMPARE_DATE}}까지.\nTrigger: #7 취합중 → 비딩중 · #9 전달됨 → 비딩중 (라운드 ≥ 2)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{RFP_ID}}, {{DEADLINE_KST}}, {{COMPARE_DATE}}, {{ORG_CONTACT_NAME}}, {{ROUND}}, {{CHANGE_SUMMARY}}, {{DESTINATION}}, {{EVENT_TYPE}}, {{TRACK_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 바뀐 조건으로 호텔에 다시 요청했습니다 · {{RFP_ID}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">요청번호 {{RFP_ID}} · 새 견적 마감 {{DEADLINE_KST}} · 비교표는 {{COMPARE_DATE}}까지.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">견적 요청</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#E3F5F2;color:#076B64;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">비딩중 · 라운드 {{ROUND}}</span>&nbsp;&nbsp;REF {{RFP_ID}}</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">바뀐 조건으로 호텔에 다시 요청했습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">{{ORG_CONTACT_NAME}}님, 조건이 바뀌어 호텔에 다시 요청을 보냈습니다. 이전 라운드에서 받은 제안은 기록으로 보관됩니다.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">변경 내용</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{CHANGE_SUMMARY}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">행사</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{DESTINATION}} {{EVENT_TYPE}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">새 견적 마감</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{DEADLINE_KST}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">새 비교표 예정</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{COMPARE_DATE}}</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (amber) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FFF3D6\" style=\"background-color:#FFF3D6;border-radius:8px;\"><tr><td bgcolor=\"#FFF3D6\" style=\"padding:14px 18px;border-left:3px solid #FFC24B;background-color:#FFF3D6;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">새 마감: {{DEADLINE_KST}}</div><div style=\"font-size:13px;line-height:1.6;color:#7A4E00;padding-top:4px;\">새 마감 후 비교표를 정리해 {{COMPARE_DATE}}까지 전달합니다.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{TRACK_URL}}\" style=\"height:52px;v-text-anchor:middle;width:300px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">진행 상황 보기</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{TRACK_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">진행 상황 보기</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">개인 링크입니다. 로그인 없이 열리니 외부에 전달하지 말아 주세요.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">호텔에 전달되는 요건서에는 회사명과 예산이 포함되지 않습니다. 주최 측 수수료는 없습니다.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO에 견적을 요청하신 분께 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ORG_DELIVERED": "<!DOCTYPE html>\n<!--\nMICEGO email template: ORG_DELIVERED (견적 도착 (전달됨))\nSubject: [MICEGO] 받은 제안을 비교표로 전달드립니다 · {{RFP_ID}}\nPreheader: 요청번호 {{RFP_ID}} · 제안 {{PROPOSAL_COUNT}}건 · 가장 빠른 견적 유효기한 {{VALID_UNTIL_MIN}}\nTrigger: #6 취합중 → 전달됨\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{RFP_ID}}, {{PROPOSAL_COUNT}}, {{VALID_UNTIL_MIN}}, {{ORG_CONTACT_NAME}}, {{TRACK_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 받은 제안을 비교표로 전달드립니다 · {{RFP_ID}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">요청번호 {{RFP_ID}} · 제안 {{PROPOSAL_COUNT}}건 · 가장 빠른 견적 유효기한 {{VALID_UNTIL_MIN}}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">견적 요청</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#E3F5F2;color:#076B64;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">전달됨</span>&nbsp;&nbsp;REF {{RFP_ID}}</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">받은 제안 {{PROPOSAL_COUNT}}건을 비교표로 정리했습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">{{ORG_CONTACT_NAME}}님, 호텔 제안이 도착했습니다. 아래 링크에서 비교표를 보시고 마음에 드는 제안을 골라 알려 주세요.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">받은 제안</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{PROPOSAL_COUNT}}건</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">가장 빠른 견적 유효기한</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{VALID_UNTIL_MIN}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">호텔 이름</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">선택 전까지 제안 A·B·C로 표시</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (amber) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FFF3D6\" style=\"background-color:#FFF3D6;border-radius:8px;\"><tr><td bgcolor=\"#FFF3D6\" style=\"padding:14px 18px;border-left:3px solid #FFC24B;background-color:#FFF3D6;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">견적 유효기한 {{VALID_UNTIL_MIN}}</div><div style=\"font-size:13px;line-height:1.6;color:#7A4E00;padding-top:4px;\">가장 빠른 제안의 유효기한입니다. 그 전에 선택 여부를 알려 주세요.</div></td></tr></table></td></tr></table>\n<!-- F. Callout (gray) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#EEF2F8\" style=\"background-color:#EEF2F8;border-radius:8px;\"><tr><td bgcolor=\"#EEF2F8\" style=\"padding:14px 18px;border-left:3px solid #8B97B5;background-color:#EEF2F8;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">선택하는 방법</div><div style=\"font-size:13px;line-height:1.6;color:#3F4C6B;padding-top:4px;\">이 메일에 회신해 고르신 제안을 알려 주시거나, 링크의 페이지에서 「제안 선택하기」 버튼을 눌러 메일 초안을 여세요.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{TRACK_URL}}\" style=\"height:52px;v-text-anchor:middle;width:300px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">비교표 보기</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{TRACK_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">비교표 보기</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">개인 링크입니다. 로그인 없이 열리니 외부에 전달하지 말아 주세요.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">호텔에 전달되는 요건서에는 회사명과 예산이 포함되지 않습니다. 주최 측 수수료는 없습니다.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO에 견적을 요청하신 분께 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ORG_WON": "<!DOCTYPE html>\n<!--\nMICEGO email template: ORG_WON (성사 (호텔 선정·연결))\nSubject: [MICEGO] 선정하신 호텔과 연결해 드렸습니다 · {{RFP_ID}}\nPreheader: 요청번호 {{RFP_ID}} · {{SELECTED_HOTEL}} 담당자에게 연결 메일을 보냈고 참조로 넣었습니다.\nTrigger: #10 전달됨 → 성사\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{RFP_ID}}, {{SELECTED_HOTEL}}, {{ORG_CONTACT_NAME}}, {{TRACK_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 선정하신 호텔과 연결해 드렸습니다 · {{RFP_ID}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">요청번호 {{RFP_ID}} · {{SELECTED_HOTEL}} 담당자에게 연결 메일을 보냈고 참조로 넣었습니다.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">견적 요청</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#EEF2F8;color:#3F4C6B;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">성사</span>&nbsp;&nbsp;REF {{RFP_ID}}</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">선정하신 호텔과 연결해 드렸습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">{{ORG_CONTACT_NAME}}님, 선정하신 호텔의 담당자에게 연결 메일을 보냈고 참조로 넣었습니다. 이 메일은 확인용이니, 이후 소통은 연결 메일에서 이어 가시면 됩니다.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">선정 호텔</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{SELECTED_HOTEL}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">호텔에 전달한 정보</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">회사명 · 담당자 이름 · 이메일 · 전화</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">연결 메일</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">호텔 담당자에게 발송, 담당자님 참조</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (gray) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#EEF2F8\" style=\"background-color:#EEF2F8;border-radius:8px;\"><tr><td bgcolor=\"#EEF2F8\" style=\"padding:14px 18px;border-left:3px solid #8B97B5;background-color:#EEF2F8;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">이제 호텔과 직접 진행하시면 됩니다</div><div style=\"font-size:13px;line-height:1.6;color:#3F4C6B;padding-top:4px;\">계약과 결제는 호텔과 직접 진행합니다. 다른 호텔에는 결과만 전달되며 회사명과 연락처는 전달되지 않았습니다.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{TRACK_URL}}\" style=\"height:52px;v-text-anchor:middle;width:300px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">진행 상황 보기</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{TRACK_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">진행 상황 보기</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">개인 링크입니다. 로그인 없이 열리니 외부에 전달하지 말아 주세요.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">호텔에 전달되는 요건서에는 회사명과 예산이 포함되지 않습니다. 주최 측 수수료는 없습니다.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO에 견적을 요청하신 분께 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ORG_LOST": "<!DOCTYPE html>\n<!--\nMICEGO email template: ORG_LOST (미성사 종료)\nSubject: [MICEGO] 이번 요청은 성사 없이 종료되었습니다 · {{RFP_ID}}\nPreheader: 요청번호 {{RFP_ID}} · 종료 사유와 이후 안내를 드립니다. 새 요청은 언제든 가능합니다.\nTrigger: #11 전달됨 → 미성사 · #8 취합중 → 미성사\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{RFP_ID}}, {{ORG_CONTACT_NAME}}, {{DESTINATION}}, {{EVENT_TYPE}}, {{PAX}}, {{LOST_REASON}}, {{TRACK_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 이번 요청은 성사 없이 종료되었습니다 · {{RFP_ID}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">요청번호 {{RFP_ID}} · 종료 사유와 이후 안내를 드립니다. 새 요청은 언제든 가능합니다.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">견적 요청</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#EEF2F8;color:#3F4C6B;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">미성사</span>&nbsp;&nbsp;REF {{RFP_ID}}</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">이번 요청은 성사 없이 종료되었습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청을 다음 사유로 종료했습니다.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">요청번호</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{RFP_ID}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">행사</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{DESTINATION}} {{EVENT_TYPE}} · {{PAX}}</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (gray) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#EEF2F8\" style=\"background-color:#EEF2F8;border-radius:8px;\"><tr><td bgcolor=\"#EEF2F8\" style=\"padding:14px 18px;border-left:3px solid #8B97B5;background-color:#EEF2F8;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">종료 사유</div><div style=\"font-size:13px;line-height:1.6;color:#3F4C6B;padding-top:4px;\">{{LOST_REASON}}</div></td></tr></table></td></tr></table>\n<!-- F. Callout (gray) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#EEF2F8\" style=\"background-color:#EEF2F8;border-radius:8px;\"><tr><td bgcolor=\"#EEF2F8\" style=\"padding:14px 18px;border-left:3px solid #8B97B5;background-color:#EEF2F8;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">호텔에 전달되는 정보</div><div style=\"font-size:13px;line-height:1.6;color:#3F4C6B;padding-top:4px;\">호텔에는 요청이 종료되었다는 결과만 전달되며, 회사명과 담당자 연락처는 전달되지 않았습니다.</div></td></tr></table></td></tr></table>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:20px 32px 0;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.7;color:#4A5D8C;\">조건이 정해지면 새로 요청해 주세요. 진행 상황 페이지에서 받으신 제안 기록을 계속 보실 수 있습니다.</td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{TRACK_URL}}\" style=\"height:52px;v-text-anchor:middle;width:300px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">진행 상황 보기</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{TRACK_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">진행 상황 보기</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">개인 링크입니다. 로그인 없이 열리니 외부에 전달하지 말아 주세요.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">호텔에 전달되는 요건서에는 회사명과 예산이 포함되지 않습니다. 주최 측 수수료는 없습니다.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO에 견적을 요청하신 분께 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ORG_CANCELLED": "<!DOCTYPE html>\n<!--\nMICEGO email template: ORG_CANCELLED (취소 확인)\nSubject: [MICEGO] 요청이 취소되었습니다 · {{RFP_ID}}\nPreheader: 요청번호 {{RFP_ID}} · 취소를 확인했습니다. 회사명과 연락처는 어느 호텔에도 전달되지 않았습니다.\nTrigger: #12 종료 전 어느 상태 → 취소\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{RFP_ID}}, {{ORG_CONTACT_NAME}}, {{DESTINATION}}, {{EVENT_TYPE}}, {{CANCELLED_AT}}, {{TRACK_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 요청이 취소되었습니다 · {{RFP_ID}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">요청번호 {{RFP_ID}} · 취소를 확인했습니다. 회사명과 연락처는 어느 호텔에도 전달되지 않았습니다.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">견적 요청</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#FBE9E9;color:#9B2C2C;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">취소</span>&nbsp;&nbsp;REF {{RFP_ID}}</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">요청이 취소되었습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">{{ORG_CONTACT_NAME}}님, 아래 요청의 취소를 확인했습니다.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">요청번호</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{RFP_ID}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">행사</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{DESTINATION}} {{EVENT_TYPE}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">취소일시</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{CANCELLED_AT}}</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (red) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FBEAEA\" style=\"background-color:#FBEAEA;border-radius:8px;\"><tr><td bgcolor=\"#FBEAEA\" style=\"padding:14px 18px;border-left:3px solid #D08A8A;background-color:#FBEAEA;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#7A1F1F;\">전달된 정보 없음</div><div style=\"font-size:13px;line-height:1.6;color:#8F3535;padding-top:4px;\">회사명과 담당자 연락처는 어느 호텔에도 전달되지 않았습니다.</div></td></tr></table></td></tr></table>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:20px 32px 0;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.7;color:#4A5D8C;\">다시 진행하실 때는 새로 요청해 주세요.</td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{TRACK_URL}}\" style=\"height:52px;v-text-anchor:middle;width:300px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">진행 상황 보기</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{TRACK_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">진행 상황 보기</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">개인 링크입니다. 로그인 없이 열리니 외부에 전달하지 말아 주세요.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">호텔에 전달되는 요건서에는 회사명과 예산이 포함되지 않습니다. 주최 측 수수료는 없습니다.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO에 견적을 요청하신 분께 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "HTL_INVITE": "<!DOCTYPE html>\n<!--\nMICEGO email template: HTL_INVITE (Bid invitation)\nSubject: [MICEGO] New group request · REF {{RFP_ID}} · quotes by {{DEADLINE_KST}}\nSubject (round >= 2 re-invite): [MICEGO] Updated request, new deadline · REF {{RFP_ID}} · quotes by {{DEADLINE_KST}}\nPreheader: Ref {{RFP_ID}} · {{DESTINATION}} · Quotes due {{DEADLINE_KST}}.\nTrigger: #4 오픈 → 비딩중 · 비딩중 추가 초대 · 재초대 (라운드 ≥ 2)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{RFP_ID}}, {{DEADLINE_KST}}, {{DESTINATION}}, {{HOTEL_BID_URL}}, {{EVENT_TYPE}}, {{EVENT_DATES}}, {{PAX}}, {{ROOMS}}, {{EVENT_SPACE}}, {{PUBLIC_NOTE}}, {{ROUND}}, {{CHANGE_SUMMARY}}, {{PREV_DEADLINE}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}, {{UNSUBSCRIBE_URL}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"en\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] New group request · REF {{RFP_ID}} · quotes by {{DEADLINE_KST}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">Ref {{RFP_ID}} · {{DESTINATION}} · Quotes due {{DEADLINE_KST}}.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">Partner Network</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#E3F5F2;color:#076B64;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">New request</span>&nbsp;&nbsp;REF {{RFP_ID}}</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">A new MICE group request matches your destination.</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">MICEGO sources overseas MICE programs for Korean organizers. This request has confirmed dates and a complete brief, and we are inviting a short list of hotels to quote.</div>\n</td></tr></table>\n<!-- OPTIONAL BLOCK START: REINVITE. Include only when ROUND >= 2 (re-invite after the organizer changed the brief) -->\n<!-- F. Callout (amber) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FFF3D6\" style=\"background-color:#FFF3D6;border-radius:8px;\"><tr><td bgcolor=\"#FFF3D6\" style=\"padding:14px 18px;border-left:3px solid #FFC24B;background-color:#FFF3D6;font-family:Arial,Helvetica,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">Updated request &mdash; new deadline</div><div style=\"font-size:13px;line-height:1.6;color:#7A4E00;padding-top:4px;\">The organizer changed the brief (round {{ROUND}}): {{CHANGE_SUMMARY}}. The earlier deadline ({{PREV_DEADLINE}}) no longer applies &mdash; please quote by {{DEADLINE_KST}}. Any earlier quote is kept on file, but please submit a new one for the updated request.</div></td></tr></table></td></tr></table>\n<!-- OPTIONAL BLOCK END: REINVITE -->\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Event type</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{EVENT_TYPE}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Dates</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{EVENT_DATES}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Attendees</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{PAX}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Destination</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{DESTINATION}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Rooms required</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{ROOMS}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Event space</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{EVENT_SPACE}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Notes (reviewed by MICEGO)</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{PUBLIC_NOTE}}</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (amber) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FFF3D6\" style=\"background-color:#FFF3D6;border-radius:8px;\"><tr><td bgcolor=\"#FFF3D6\" style=\"padding:14px 18px;border-left:3px solid #FFC24B;background-color:#FFF3D6;font-family:Arial,Helvetica,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">Quote deadline &mdash; {{DEADLINE_KST}}</div><div style=\"font-size:13px;line-height:1.6;color:#7A4E00;padding-top:4px;\">Late submissions cannot be included in the organizer's comparison sheet. We'll send a reminder 24 hours before the deadline.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{HOTEL_BID_URL}}\" style=\"height:52px;v-text-anchor:middle;width:320px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">View request &amp; submit quote</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{HOTEL_BID_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">View request &amp; submit quote</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">This is your personal link &mdash; no login needed. Opening it marks the invitation as viewed, and it stops working when the request closes. Please don&rsquo;t forward it.<br><br><a href=\"{{HOTEL_BID_URL}}\" style=\"color:#076E67;text-decoration:underline;\">Can&rsquo;t quote on this one? Decline on the request page</a> &mdash; it never counts against you; three unanswered invitations in a row pause your listing.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">The organizer's company name is withheld, and the budget is never part of the brief. Your property name is shown to the organizer only if they select your proposal &mdash; in that case you receive the organizer's company name and contact details.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">You are receiving this because your property is listed in the MICEGO supplier network.<br>MICEGO &middot; Contact <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a><br><a href=\"{{UNSUBSCRIBE_URL}}\" style=\"color:#7A86A5;text-decoration:underline;\">Unsubscribe from sourcing invitations</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "HTL_REMINDER": "<!DOCTYPE html>\n<!--\nMICEGO email template: HTL_REMINDER (Deadline reminder (24h))\nSubject: [MICEGO] Reminder: quotes close in 24 hours · REF {{RFP_ID}} · quotes by {{DEADLINE_KST}}\nPreheader: Ref {{RFP_ID}} · {{PAX}} · Quotes close {{DEADLINE_KST}}.\nTrigger: 마감 24시간 전 · 미제출·미거절 초대 (cron 1분)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{RFP_ID}}, {{DEADLINE_KST}}, {{PAX}}, {{HOTEL_BID_URL}}, {{DESTINATION}}, {{EVENT_DATES}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}, {{UNSUBSCRIBE_URL}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"en\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] Reminder: quotes close in 24 hours · REF {{RFP_ID}} · quotes by {{DEADLINE_KST}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">Ref {{RFP_ID}} · {{PAX}} · Quotes close {{DEADLINE_KST}}.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">Partner Network</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#FFF3D6;color:#8A5A00;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">Reminder</span>&nbsp;&nbsp;REF {{RFP_ID}}</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">Quotes for this request close in 24 hours.</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">You haven&rsquo;t submitted or declined yet. If you&rsquo;d like to be considered, please quote before the deadline. If this one isn&rsquo;t a fit, declining takes one click.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Destination</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{DESTINATION}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Attendees</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{PAX}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Dates</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{EVENT_DATES}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Status</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">Not yet submitted</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (amber) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FFF3D6\" style=\"background-color:#FFF3D6;border-radius:8px;\"><tr><td bgcolor=\"#FFF3D6\" style=\"padding:14px 18px;border-left:3px solid #FFC24B;background-color:#FFF3D6;font-family:Arial,Helvetica,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">Quote deadline &mdash; {{DEADLINE_KST}}</div><div style=\"font-size:13px;line-height:1.6;color:#7A4E00;padding-top:4px;\">Late submissions cannot be included in the organizer's comparison sheet.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{HOTEL_BID_URL}}\" style=\"height:52px;v-text-anchor:middle;width:320px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">Open request page</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{HOTEL_BID_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">Open request page</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">This is your personal link &mdash; no login needed. Please don&rsquo;t forward it. If you&rsquo;ve just submitted or declined, you can ignore this reminder.<br><br><a href=\"{{HOTEL_BID_URL}}\" style=\"color:#076E67;text-decoration:underline;\">Decline on the request page</a> &mdash; it never counts against you.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">The organizer's company name is withheld, and the budget is never part of the brief. Your property name is shown to the organizer only if they select your proposal.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">You are receiving this because your property is listed in the MICEGO supplier network.<br>MICEGO &middot; Contact <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a><br><a href=\"{{UNSUBSCRIBE_URL}}\" style=\"color:#7A86A5;text-decoration:underline;\">Unsubscribe from sourcing invitations</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "HTL_QUOTE_RECEIVED": "<!DOCTYPE html>\n<!--\nMICEGO email template: HTL_QUOTE_RECEIVED (Quote received)\nSubject: [MICEGO] Quote received · REF {{RFP_ID}}\nPreheader: Ref {{RFP_ID}} · Quote received ({{CURRENCY}}). Revise until {{DEADLINE_KST}}.\nTrigger: 호텔 견적 제출·수정 (초대 상태 submitted, 호텔 액션)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{RFP_ID}}, {{CURRENCY}}, {{DEADLINE_KST}}, {{HOTEL_CONTACT_NAME}}, {{DESTINATION}}, {{PAX}}, {{SUBMITTED_AT}}, {{HOTEL_BID_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"en\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] Quote received · REF {{RFP_ID}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">Ref {{RFP_ID}} · Quote received ({{CURRENCY}}). Revise until {{DEADLINE_KST}}.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">Partner Network</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#E3F5F2;color:#076B64;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">Quote received</span>&nbsp;&nbsp;REF {{RFP_ID}}</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">We&rsquo;ve received your quote.</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">Thank you, {{HOTEL_CONTACT_NAME}}. Your quote is on file. If you revise it, the latest version replaces the earlier one.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Request</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{DESTINATION}} &middot; {{PAX}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Currency</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{CURRENCY}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Submitted at</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{SUBMITTED_AT}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Changes allowed until</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{DEADLINE_KST}}</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (amber) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FFF3D6\" style=\"background-color:#FFF3D6;border-radius:8px;\"><tr><td bgcolor=\"#FFF3D6\" style=\"padding:14px 18px;border-left:3px solid #FFC24B;background-color:#FFF3D6;font-family:Arial,Helvetica,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">You can revise until {{DEADLINE_KST}}</div><div style=\"font-size:13px;line-height:1.6;color:#7A4E00;padding-top:4px;\">Use the same personal link below. After the deadline the quote is locked and goes into the organizer's comparison sheet.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{HOTEL_BID_URL}}\" style=\"height:52px;v-text-anchor:middle;width:320px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">Review or revise quote</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{HOTEL_BID_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">Review or revise quote</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">This is your personal link &mdash; no login needed. Please don&rsquo;t forward it.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">Your property name is shown to the organizer only if they select your proposal. We&rsquo;ll email you the result either way.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">You are receiving this because your property is listed in the MICEGO supplier network.<br>MICEGO &middot; Contact <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "HTL_SELECTED_CONNECT": "<!DOCTYPE html>\n<!--\nMICEGO email template: HTL_SELECTED_CONNECT (Selected + organizer introduction)\nSubject: [MICEGO] Your proposal was selected · REF {{RFP_ID}}\nPreheader: Ref {{RFP_ID}} · The organizer selected your proposal. Their contact details are below.\nTrigger: #10 전달됨 → 성사 (선정 호텔 1곳, 오거나이저 참조)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nCc: {{ORG_EMAIL}}\nVariables: {{RFP_ID}}, {{HOTEL_NAME}}, {{ORG_EMAIL}}, {{ORG_COMPANY}}, {{ORG_CONTACT_FULL}}, {{ORG_PHONE}}, {{DESTINATION}}, {{PAX}}, {{EVENT_DATES}}, {{HOTEL_BID_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"en\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] Your proposal was selected · REF {{RFP_ID}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">Ref {{RFP_ID}} · The organizer selected your proposal. Their contact details are below.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">Partner Network</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#E3F5F2;color:#076B64;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">Selected</span>&nbsp;&nbsp;REF {{RFP_ID}}</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">Your proposal was selected.</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">The organizer selected {{HOTEL_NAME}} for the request below. Their details follow, and they are copied on this email &mdash; reply to all to get started.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Organizer company</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{ORG_COMPANY}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Contact name</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{ORG_CONTACT_FULL}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Email</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{ORG_EMAIL}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Phone</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{ORG_PHONE}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Request</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{DESTINATION}} &middot; {{PAX}} &middot; {{EVENT_DATES}}</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (gray) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#EEF2F8\" style=\"background-color:#EEF2F8;border-radius:8px;\"><tr><td bgcolor=\"#EEF2F8\" style=\"padding:14px 18px;border-left:3px solid #8B97B5;background-color:#EEF2F8;font-family:Arial,Helvetica,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">Next step</div><div style=\"font-size:13px;line-height:1.6;color:#3F4C6B;padding-top:4px;\">Contracting and payment are arranged directly between your property and the organizer.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{HOTEL_BID_URL}}\" style=\"height:52px;v-text-anchor:middle;width:320px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">View result page</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{HOTEL_BID_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">View result page</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">This is your personal link &mdash; no login needed. Please don&rsquo;t forward it.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">The budget was never part of the brief. Your personal link keeps showing your submitted quote and this result.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">You are receiving this because your property is listed in the MICEGO supplier network.<br>MICEGO &middot; Contact <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "HTL_NOT_SELECTED": "<!DOCTYPE html>\n<!--\nMICEGO email template: HTL_NOT_SELECTED (Not selected)\nSubject: [MICEGO] Result: not selected this time · REF {{RFP_ID}}\nPreheader: Ref {{RFP_ID}} · The organizer chose another proposal. Your details were not shared.\nTrigger: #10 전달됨 → 성사 (선정되지 않은 제출 호텔)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{RFP_ID}}, {{HOTEL_CONTACT_NAME}}, {{DESTINATION}}, {{PAX}}, {{EVENT_DATES}}, {{HOTEL_BID_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"en\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] Result: not selected this time · REF {{RFP_ID}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">Ref {{RFP_ID}} · The organizer chose another proposal. Your details were not shared.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">Partner Network</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#EEF2F8;color:#3F4C6B;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">Not selected</span>&nbsp;&nbsp;REF {{RFP_ID}}</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">The organizer chose another proposal this time.</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">Thank you for quoting, {{HOTEL_CONTACT_NAME}}. We appreciate the time you put into this request.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Destination</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{DESTINATION}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Attendees</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{PAX}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Dates</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{EVENT_DATES}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Result</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">Not selected</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (gray) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#EEF2F8\" style=\"background-color:#EEF2F8;border-radius:8px;\"><tr><td bgcolor=\"#EEF2F8\" style=\"padding:14px 18px;border-left:3px solid #8B97B5;background-color:#EEF2F8;font-family:Arial,Helvetica,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">Nothing was shared</div><div style=\"font-size:13px;line-height:1.6;color:#3F4C6B;padding-top:4px;\">Your property name and contact details were not shared with the organizer. Your personal link still shows this result and your submitted quote.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{HOTEL_BID_URL}}\" style=\"height:52px;v-text-anchor:middle;width:320px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">View result page</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{HOTEL_BID_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">View result page</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">This is your personal link &mdash; no login needed. Please don&rsquo;t forward it.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">Not being selected never affects your listing. We&rsquo;ll invite you to matching requests as they come in.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">You are receiving this because your property is listed in the MICEGO supplier network.<br>MICEGO &middot; Contact <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "HTL_CONFIRM": "<!DOCTYPE html>\n<!--\nMICEGO email template: HTL_CONFIRM (Confirm quote entered on your behalf)\nSubject: [MICEGO] Please confirm the quote entered for your property · REF {{RFP_ID}}\nPreheader: Ref {{RFP_ID}} · A quote was entered for you. Confirm within {{EXPIRES_HOURS}} hours.\nTrigger: 파트너 대리 입력(partner_quote_proxy_enter) · 재발송(partner_quote_proxy_resend)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{RFP_ID}}, {{EXPIRES_HOURS}}, {{HOTEL_CONTACT_NAME}}, {{PARTNER_PUBLIC_NAME}}, {{DESTINATION}}, {{PAX}}, {{EVENT_DATES}}, {{ROUND}}, {{CONFIRM_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"en\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] Please confirm the quote entered for your property · REF {{RFP_ID}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">Ref {{RFP_ID}} · A quote was entered for you. Confirm within {{EXPIRES_HOURS}} hours.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">Partner Network</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#FFF3D6;color:#8A5A00;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">Action needed</span>&nbsp;&nbsp;REF {{RFP_ID}}</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">A quote was entered on your behalf &mdash; please confirm it.</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">{{HOTEL_CONTACT_NAME}}, {{PARTNER_PUBLIC_NAME}} entered a quote for request {{RFP_ID}} after speaking with your team. It will be shown to the organizer only after you confirm it. If anything is wrong, flag it on the same page and it will not be used.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Destination</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{DESTINATION}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Attendees</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{PAX}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Dates</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{EVENT_DATES}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Entered by</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{PARTNER_PUBLIC_NAME}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Round</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{ROUND}}</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (amber) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FFF3D6\" style=\"background-color:#FFF3D6;border-radius:8px;\"><tr><td bgcolor=\"#FFF3D6\" style=\"padding:14px 18px;border-left:3px solid #FFC24B;background-color:#FFF3D6;font-family:Arial,Helvetica,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">Confirm within {{EXPIRES_HOURS}} hours</div><div style=\"font-size:13px;line-height:1.6;color:#7A4E00;padding-top:4px;\">The confirmation link is single-use and expires {{EXPIRES_HOURS}} hours after it was sent. If it expires, the entered quote is dropped and you can still quote yourself from your original invitation link before the deadline.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{CONFIRM_URL}}\" style=\"height:52px;v-text-anchor:middle;width:320px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">Review and confirm quote</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{CONFIRM_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">Review and confirm quote</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">This is a single-use link for your property only. Opening it does not confirm anything &mdash; confirmation happens only when you press the button on the page. Please don&rsquo;t forward it.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">Confirming is binding in the same way as submitting the quote yourself. The organizer's company name is withheld until they select your proposal.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">You are receiving this because your property is listed in the MICEGO supplier network.<br>MICEGO &middot; Contact <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "CONSOLE_NOTICE": "<!DOCTYPE html>\n<!--\nMICEGO email template: CONSOLE_NOTICE (콘솔 내부 알림 (지역 파트너 · 본사))\nSubject: [MICEGO 콘솔] {{NOTICE_TITLE}}\nPreheader: {{NOTICE_TITLE}} · 지역 파트너 콘솔 알림입니다. 자세한 내용은 콘솔에서 확인하세요.\nTrigger: 파트너 배정·인계·반려, 호텔 확인·이의, 정산 단계 변경 등 (private.enqueue_if_template 의 공통 대체 템플릿)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{NOTICE_TITLE}}, {{NOTICE_BODY}}, {{RFP_ID}}, {{CONSOLE_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO 콘솔] {{NOTICE_TITLE}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">{{NOTICE_TITLE}} · 지역 파트너 콘솔 알림입니다. 자세한 내용은 콘솔에서 확인하세요.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">운영 콘솔</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#E3F5F2;color:#076B64;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">콘솔 알림</span>&nbsp;&nbsp;REF {{RFP_ID}}</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">{{NOTICE_TITLE}}</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">{{NOTICE_BODY}}</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">요청번호</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{RFP_ID}}</td></tr>\n</table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{CONSOLE_URL}}\" style=\"height:52px;v-text-anchor:middle;width:300px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">콘솔에서 보기</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{CONSOLE_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">콘솔에서 보기</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">콘솔은 초대받은 계정으로 로그인해야 열립니다. 이 메일은 전달하지 말아 주세요.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">오거나이저·호텔의 연락처는 이 메일에 담지 않습니다. 상세는 콘솔에서 확인하세요.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO 운영 콘솔 계정(지역 파트너·본사)으로 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "PTN_APPLIED": "<!DOCTYPE html>\n<!--\nMICEGO email template: PTN_APPLIED (Partner application received)\nSubject: [MICEGO] Partner application received · REF {{PARTNER_ID}}\nPreheader: Ref {{PARTNER_ID}} · We received your application and will reply within 5 business days.\nTrigger: 파트너 신청 접수 (상태 pending 생성)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{PARTNER_ID}}, {{APPLICANT_NAME}}, {{PROPERTY_NAME}}, {{PROPERTY_LOCATION}}, {{APPLIED_AT}}, {{REVIEW_BY}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"en\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] Partner application received · REF {{PARTNER_ID}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">Ref {{PARTNER_ID}} · We received your application and will reply within 5 business days.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">Partner Network</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#E3F5F2;color:#076B64;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">Application received</span>&nbsp;&nbsp;REF {{PARTNER_ID}}</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">We received your partner application.</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">Thank you for applying to join the MICEGO Partner Network, {{APPLICANT_NAME}}. We&rsquo;ll check the property and contact details and reply by email.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Property</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{PROPERTY_NAME}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Location</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{PROPERTY_LOCATION}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Applicant</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{APPLICANT_NAME}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Received</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{APPLIED_AT}}</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (amber) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FFF3D6\" style=\"background-color:#FFF3D6;border-radius:8px;\"><tr><td bgcolor=\"#FFF3D6\" style=\"padding:14px 18px;border-left:3px solid #FFC24B;background-color:#FFF3D6;font-family:Arial,Helvetica,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">We&rsquo;ll reply within 5 business days</div><div style=\"font-size:13px;line-height:1.6;color:#7A4E00;padding-top:4px;\">Expect our decision by {{REVIEW_BY}}. If we need to confirm anything, we&rsquo;ll write to you at this address.</div></td></tr></table></td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">There is no listing fee to join the network.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">You are receiving this because you applied to the MICEGO Partner Network.<br>MICEGO &middot; Contact <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "PTN_APPROVED": "<!DOCTYPE html>\n<!--\nMICEGO email template: PTN_APPROVED (Partner approved)\nSubject: [MICEGO] Partner application approved · REF {{PARTNER_ID}}\nPreheader: Ref {{PARTNER_ID}} · You're approved. Invitations arrive by email; here is how it works.\nTrigger: 신청·심사중 → 승인\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{PARTNER_ID}}, {{PROPERTY_NAME}}, {{PROPERTY_LOCATION}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"en\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] Partner application approved · REF {{PARTNER_ID}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">Ref {{PARTNER_ID}} · You're approved. Invitations arrive by email; here is how it works.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">Partner Network</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#E3F5F2;color:#076B64;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">Approved</span>&nbsp;&nbsp;REF {{PARTNER_ID}}</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">Welcome to the MICEGO Partner Network.</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">{{PROPERTY_NAME}} is approved. From now on, when an organizer&rsquo;s request matches your destination and group capacity, we&rsquo;ll invite you to quote. Here is what to expect.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Invitations</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">You receive a personal quote link by email &mdash; no login and no account to manage.</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Declining</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">You can decline any request. Declining never counts against you.</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Pausing</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">If three invitations in a row go unanswered, we pause your listing. Reply to us and we&rsquo;ll reinstate it.</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Fees</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">There is no listing fee to join.</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (gray) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#EEF2F8\" style=\"background-color:#EEF2F8;border-radius:8px;\"><tr><td bgcolor=\"#EEF2F8\" style=\"padding:14px 18px;border-left:3px solid #8B97B5;background-color:#EEF2F8;font-family:Arial,Helvetica,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">Approved &middot; {{PROPERTY_NAME}}</div><div style=\"font-size:13px;line-height:1.6;color:#3F4C6B;padding-top:4px;\">Listed for {{PROPERTY_LOCATION}}. Your first invitation will come when a matching request opens.</div></td></tr></table></td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">Organizers&rsquo; company names are withheld until they select a proposal, and the budget is never part of a brief.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">You are receiving this because you applied to the MICEGO Partner Network.<br>MICEGO &middot; Contact <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "PTN_REJECTED": "<!DOCTYPE html>\n<!--\nMICEGO email template: PTN_REJECTED (Partner not approved)\nSubject: [MICEGO] Partner application update · REF {{PARTNER_ID}}\nPreheader: Ref {{PARTNER_ID}} · We can't approve this application right now. The reason is inside.\nTrigger: 신청·심사중 → 거절 (사유 필수)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{PARTNER_ID}}, {{APPLICANT_NAME}}, {{PROPERTY_NAME}}, {{PROPERTY_LOCATION}}, {{PTN_REJECT_REASON}}, {{PARTNER_APPLY_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"en\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] Partner application update · REF {{PARTNER_ID}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">Ref {{PARTNER_ID}} · We can't approve this application right now. The reason is inside.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">Partner Network</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#FBE9E9;color:#9B2C2C;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">Not approved</span>&nbsp;&nbsp;REF {{PARTNER_ID}}</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">We can&rsquo;t approve this application right now.</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">Thank you for applying, {{APPLICANT_NAME}}. We reviewed {{PROPERTY_NAME}} and weren&rsquo;t able to approve it.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Property</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{PROPERTY_NAME}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Location</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{PROPERTY_LOCATION}}</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (red) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FBEAEA\" style=\"background-color:#FBEAEA;border-radius:8px;\"><tr><td bgcolor=\"#FBEAEA\" style=\"padding:14px 18px;border-left:3px solid #D08A8A;background-color:#FBEAEA;font-family:Arial,Helvetica,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#7A1F1F;\">Reason</div><div style=\"font-size:13px;line-height:1.6;color:#8F3535;padding-top:4px;\">{{PTN_REJECT_REASON}}</div></td></tr></table></td></tr></table>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:20px 32px 0;background-color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#4A5D8C;\">You&rsquo;re welcome to reapply when this changes.</td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{PARTNER_APPLY_URL}}\" style=\"height:52px;v-text-anchor:middle;width:320px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">Apply again</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{PARTNER_APPLY_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">Apply again</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">There is no listing fee to join the network.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">You are receiving this because you applied to the MICEGO Partner Network.<br>MICEGO &middot; Contact <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "PTN_REINSTATED": "<!DOCTYPE html>\n<!--\nMICEGO email template: PTN_REINSTATED (Partner reinstated)\nSubject: [MICEGO] Your listing is active again · REF {{PARTNER_ID}}\nPreheader: Ref {{PARTNER_ID}} · Thanks for getting back to us. Invitations will resume.\nTrigger: 중지 → 승인 (재승인)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{PARTNER_ID}}, {{PROPERTY_NAME}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"en\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] Your listing is active again · REF {{PARTNER_ID}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">Ref {{PARTNER_ID}} · Thanks for getting back to us. Invitations will resume.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">Partner Network</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#E3F5F2;color:#076B64;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">Reinstated</span>&nbsp;&nbsp;REF {{PARTNER_ID}}</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">Your listing is active again.</div>\n<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">Thanks for getting back to us. {{PROPERTY_NAME}} is approved again and can receive invitations.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Property</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{PROPERTY_NAME}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">Status</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">Active</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (gray) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#EEF2F8\" style=\"background-color:#EEF2F8;border-radius:8px;\"><tr><td bgcolor=\"#EEF2F8\" style=\"padding:14px 18px;border-left:3px solid #8B97B5;background-color:#EEF2F8;font-family:Arial,Helvetica,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">Nothing else to do</div><div style=\"font-size:13px;line-height:1.6;color:#3F4C6B;padding-top:4px;\">Invitations will arrive by email as matching requests open.</div></td></tr></table></td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">Declining a request never counts against you. There is no listing fee to join.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">You are receiving this because you applied to the MICEGO Partner Network.<br>MICEGO &middot; Contact <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ACC_EMAIL_CODE": "<!DOCTYPE html>\n<!--\nMICEGO email template: ACC_EMAIL_CODE (이메일 인증번호)\nSubject: [MICEGO] 이메일 인증번호를 보내드립니다\nPreheader: {{PURPOSE}} 화면에 아래 6자리 인증번호를 입력해 주세요. 유효 시간은 {{EXPIRES_MIN}}분입니다.\nTrigger: 회원 가입 · 이메일 변경 중 이메일 인증 단계 (재발송 포함)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{PURPOSE}}, {{EXPIRES_MIN}}, {{CODE}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 이메일 인증번호를 보내드립니다</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">{{PURPOSE}} 화면에 아래 6자리 인증번호를 입력해 주세요. 유효 시간은 {{EXPIRES_MIN}}분입니다.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">회원 계정</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#E3F5F2;color:#076B64;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">이메일 인증</span></div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">이메일 인증번호를 보내드립니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">MICEGO {{PURPOSE}} 화면에 아래 6자리 인증번호를 입력해 주세요.</div>\n</td></tr></table>\n<!-- D2. Code -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;border:1px solid #E4E8F0;border-radius:10px;padding:20px 12px;\"><div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.5;color:#5B6788;\">인증번호 (6자리)</div><div style=\"font-family:'Courier New',Courier,monospace;font-size:38px;line-height:1.3;font-weight:700;letter-spacing:10px;padding-left:10px;color:#0F1E3D;padding-top:6px;\">{{CODE}}</div></td></tr></table></td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">용도</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{PURPOSE}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">유효 시간</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{EXPIRES_MIN}}분</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">재발송</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">60초 뒤부터 가능</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (amber) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FFF3D6\" style=\"background-color:#FFF3D6;border-radius:8px;\"><tr><td bgcolor=\"#FFF3D6\" style=\"padding:14px 18px;border-left:3px solid #FFC24B;background-color:#FFF3D6;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">{{EXPIRES_MIN}}분 안에 입력해 주세요</div><div style=\"font-size:13px;line-height:1.6;color:#7A4E00;padding-top:4px;\">시간이 지났거나 5회 잘못 입력하면 이 번호는 무효가 됩니다. 화면에서 새 인증번호를 받아 주세요.</div></td></tr></table></td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">본인이 요청하지 않았다면 이 메일을 무시해 주세요. 인증번호를 입력하지 않으면 아무 일도 일어나지 않습니다. MICEGO는 전화나 메일로 인증번호를 묻지 않으니 다른 사람에게 알려 주지 마세요.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO 회원 가입 또는 이메일 변경을 시도한 주소로 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ACC_EMAIL_EXISTS": "<!DOCTYPE html>\n<!--\nMICEGO email template: ACC_EMAIL_EXISTS (이미 가입된 이메일 안내)\nSubject: [MICEGO] 이미 가입된 이메일입니다\nPreheader: 방금 이 주소로 회원 가입이 시도되었습니다. 이미 계정이 있어 새로 만들지 않았고, 로그인 방법을 안내드립니다.\nTrigger: 이미 회원인 이메일로 가입을 시도 (가입 화면에는 티 내지 않고 이 메일로만 알림)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{RESET_URL}}, {{SUPPORT_EMAIL}}, {{LOGIN_URL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 이미 가입된 이메일입니다</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">방금 이 주소로 회원 가입이 시도되었습니다. 이미 계정이 있어 새로 만들지 않았고, 로그인 방법을 안내드립니다.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">회원 계정</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#EEF2F8;color:#3F4C6B;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">가입 안내</span></div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">이 이메일은 이미 회원으로 가입되어 있습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">방금 이 주소로 회원 가입이 시도되었습니다. 이미 가입하신 계정이 있어 새 계정은 만들어지지 않았습니다. 기존 계정으로 로그인해 주세요.</div>\n</td></tr></table>\n<!-- F. Callout (gray) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#EEF2F8\" style=\"background-color:#EEF2F8;border-radius:8px;\"><tr><td bgcolor=\"#EEF2F8\" style=\"padding:14px 18px;border-left:3px solid #8B97B5;background-color:#EEF2F8;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">비밀번호가 기억나지 않으신가요</div><div style=\"font-size:13px;line-height:1.6;color:#3F4C6B;padding-top:4px;\">재설정 링크를 받아 새 비밀번호를 정하실 수 있습니다. 링크는 30분 동안 한 번만 쓸 수 있습니다.</div></td></tr></table></td></tr></table>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:20px 32px 0;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.7;color:#4A5D8C;\"><a href=\"{{RESET_URL}}\" style=\"color:#0B8F86;font-weight:700;\">비밀번호 재설정하기</a></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{LOGIN_URL}}\" style=\"height:52px;v-text-anchor:middle;width:300px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">로그인하기</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{LOGIN_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">로그인하기</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다. 계정에는 아무 변경도 없습니다. 누군가 내 이메일로 계속 가입을 시도하는 것 같다면 {{SUPPORT_EMAIL}}로 알려 주세요.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO 회원 계정과 관련해 해당 이메일 주소로 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ACC_WELCOME": "<!DOCTYPE html>\n<!--\nMICEGO email template: ACC_WELCOME (가입 완료 안내)\nSubject: [MICEGO] 회원 가입을 마쳤습니다\nPreheader: {{CONTACT_NAME}}님, 가입해 주셔서 감사합니다. 이제 견적 요청을 「내 견적 요청」에서 한곳에 볼 수 있습니다.\nTrigger: 휴대전화 인증 완료 → 정상(active) 전환\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{CONTACT_NAME}}, {{LINKED_COUNT}}, {{MY_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 회원 가입을 마쳤습니다</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">{{CONTACT_NAME}}님, 가입해 주셔서 감사합니다. 이제 견적 요청을 「내 견적 요청」에서 한곳에 볼 수 있습니다.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">회원 계정</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#E3F5F2;color:#076B64;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">가입 완료</span></div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">{{CONTACT_NAME}}님, 가입을 마쳤습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">이제 견적 요청 현황을 한곳에서 확인하고, 동료에게는 요청별 보기 전용 링크를 보낼 수 있습니다.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">이전 요청 연결</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{LINKED_COUNT}}건</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">내 견적 요청</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">로그인 후 상단 「내 견적 요청」</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">제안 선택</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">요청하신 분만 가능 (휴대전화 인증)</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (gray) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#EEF2F8\" style=\"background-color:#EEF2F8;border-radius:8px;\"><tr><td bgcolor=\"#EEF2F8\" style=\"padding:14px 18px;border-left:3px solid #8B97B5;background-color:#EEF2F8;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">이전에 접수한 요청이 있다면</div><div style=\"font-size:13px;line-height:1.6;color:#3F4C6B;padding-top:4px;\">같은 이메일로 접수한 비회원 요청은 자동으로 연결됩니다. 휴대전화 번호만 같은 요청은 운영팀 확인 뒤(영업일 기준 1일) 연결됩니다.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{MY_URL}}\" style=\"height:52px;v-text-anchor:middle;width:300px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">내 견적 요청 보기</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{MY_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">내 견적 요청 보기</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">개인 링크입니다. 외부에 전달하지 말아 주세요.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">본인이 가입하지 않았다면 이 메일에 회신해 알려 주세요. 확인 후 계정을 삭제하겠습니다.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO 회원 계정과 관련해 해당 이메일 주소로 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ACC_LINKED": "<!DOCTYPE html>\n<!--\nMICEGO email template: ACC_LINKED (이전 요청 연결 안내)\nSubject: [MICEGO] 이전 요청을 계정에 연결했습니다\nPreheader: 비회원으로 접수하신 요청 {{LINKED_COUNT}}건이 「내 견적 요청」에 추가되었습니다. 요청번호를 확인해 주세요.\nTrigger: 비회원 요청 자동 연결 (같은 이메일) · 운영자 연결 승인 (휴대전화만 일치)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{LINKED_COUNT}}, {{RFP_REFS}}, {{MY_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 이전 요청을 계정에 연결했습니다</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">비회원으로 접수하신 요청 {{LINKED_COUNT}}건이 「내 견적 요청」에 추가되었습니다. 요청번호를 확인해 주세요.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">회원 계정</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#E3F5F2;color:#076B64;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">요청 연결</span></div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">이전 요청 {{LINKED_COUNT}}건을 계정에 연결했습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">비회원으로 접수하신 요청이 이 계정의 「내 견적 요청」에 추가되었습니다.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">연결한 요청</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{RFP_REFS}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">확인 위치</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">내 견적 요청</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (gray) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#EEF2F8\" style=\"background-color:#EEF2F8;border-radius:8px;\"><tr><td bgcolor=\"#EEF2F8\" style=\"padding:14px 18px;border-left:3px solid #8B97B5;background-color:#EEF2F8;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">달라지는 점</div><div style=\"font-size:13px;line-height:1.6;color:#3F4C6B;padding-top:4px;\">요청의 진행 알림은 계속 받으시고, 제안을 선택할 때의 인증번호는 계정에 등록한 휴대전화로 갑니다. 동료에게는 보기 전용 링크를 보낼 수 있습니다.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{MY_URL}}\" style=\"height:52px;v-text-anchor:middle;width:300px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">내 견적 요청 보기</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{MY_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">내 견적 요청 보기</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">개인 링크입니다. 외부에 전달하지 말아 주세요.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">본인이 요청하지 않았거나 내 요청이 아니라면 이 메일에 회신해 알려 주세요. 확인 후 바로 연결을 해제하겠습니다.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO 회원 계정과 관련해 해당 이메일 주소로 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ACC_PW_RESET": "<!DOCTYPE html>\n<!--\nMICEGO email template: ACC_PW_RESET (비밀번호 재설정 링크)\nSubject: [MICEGO] 비밀번호 재설정 링크를 보내드립니다\nPreheader: 아래 버튼으로 새 비밀번호를 정해 주세요. 링크는 {{EXPIRES_MIN}}분 동안 한 번만 쓸 수 있습니다.\nTrigger: 비밀번호 재설정 요청 (가입된 이메일일 때만 실제 발송, 화면 응답은 동일)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{EXPIRES_MIN}}, {{SUPPORT_EMAIL}}, {{RESET_URL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 비밀번호 재설정 링크를 보내드립니다</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">아래 버튼으로 새 비밀번호를 정해 주세요. 링크는 {{EXPIRES_MIN}}분 동안 한 번만 쓸 수 있습니다.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">회원 계정</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#FFF3D6;color:#8A5A00;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">비밀번호 재설정</span></div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">비밀번호 재설정 링크를 보내드립니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">아래 버튼을 눌러 새 비밀번호를 정해 주세요. 새 비밀번호는 이 메일에 담기지 않습니다.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">유효 시간</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{EXPIRES_MIN}}분 · 한 번만 사용</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">완료 후</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">모든 기기에서 로그아웃됩니다</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (amber) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FFF3D6\" style=\"background-color:#FFF3D6;border-radius:8px;\"><tr><td bgcolor=\"#FFF3D6\" style=\"padding:14px 18px;border-left:3px solid #FFC24B;background-color:#FFF3D6;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">재설정은 이메일로만 진행합니다</div><div style=\"font-size:13px;line-height:1.6;color:#7A4E00;padding-top:4px;\">문자로는 재설정하지 않습니다. 링크가 만료됐거나 이미 썼다면 로그인 화면에서 다시 요청해 주세요.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{RESET_URL}}\" style=\"height:52px;v-text-anchor:middle;width:300px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">비밀번호 재설정하기</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{RESET_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">비밀번호 재설정하기</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">개인 링크입니다. 외부에 전달하지 말아 주세요.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">본인이 요청하지 않았다면 이 메일을 무시해 주세요. 링크를 누르지 않으면 비밀번호는 바뀌지 않습니다. 계속 요청이 온다면 {{SUPPORT_EMAIL}}로 알려 주세요.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO 회원 계정과 관련해 해당 이메일 주소로 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ACC_PW_CHANGED": "<!DOCTYPE html>\n<!--\nMICEGO email template: ACC_PW_CHANGED (비밀번호 변경 완료)\nSubject: [MICEGO] 비밀번호가 변경되었습니다\nPreheader: {{CHANGED_AT}}에 계정 비밀번호가 바뀌었고 다른 기기는 모두 로그아웃되었습니다. 본인이 아니라면 바로 확인해 주세요.\nTrigger: 비밀번호 변경 · 재설정 완료\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{CHANGED_AT}}, {{SUPPORT_EMAIL}}, {{RESET_URL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 비밀번호가 변경되었습니다</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">{{CHANGED_AT}}에 계정 비밀번호가 바뀌었고 다른 기기는 모두 로그아웃되었습니다. 본인이 아니라면 바로 확인해 주세요.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">회원 계정</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#EEF2F8;color:#3F4C6B;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">비밀번호 변경</span></div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">비밀번호가 변경되었습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">{{CHANGED_AT}}에 계정 비밀번호가 바뀌었습니다. 다른 기기는 모두 로그아웃되었습니다.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">변경 일시</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{CHANGED_AT}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">다른 기기</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">모두 로그아웃됨</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (red) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FBEAEA\" style=\"background-color:#FBEAEA;border-radius:8px;\"><tr><td bgcolor=\"#FBEAEA\" style=\"padding:14px 18px;border-left:3px solid #D08A8A;background-color:#FBEAEA;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#7A1F1F;\">본인이 바꾸지 않았다면 바로 재설정해 주세요</div><div style=\"font-size:13px;line-height:1.6;color:#8F3535;padding-top:4px;\">아래 버튼으로 비밀번호를 다시 정하면 다른 사람이 쓰던 로그인이 모두 종료됩니다.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{RESET_URL}}\" style=\"height:52px;v-text-anchor:middle;width:300px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">비밀번호 재설정하기</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{RESET_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">비밀번호 재설정하기</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">개인 링크입니다. 외부에 전달하지 말아 주세요. 30분 안에 한 번만 쓸 수 있습니다.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">본인이 요청하지 않았다면 위 버튼으로 바로 비밀번호를 다시 정하고 {{SUPPORT_EMAIL}}로 알려 주세요. 비밀번호는 이 메일에 담기지 않으며 MICEGO도 알 수 없습니다.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO 회원 계정과 관련해 해당 이메일 주소로 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ACC_EMAIL_CHANGED": "<!DOCTYPE html>\n<!--\nMICEGO email template: ACC_EMAIL_CHANGED (이메일 변경 완료 (이전 주소))\nSubject: [MICEGO] 로그인 이메일이 변경되었습니다\nPreheader: 이 계정의 로그인 이메일이 {{NEW_EMAIL_MASKED}}(으)로 바뀌었습니다. 본인이 아니라면 바로 알려 주세요.\nTrigger: 로그인 이메일 변경 완료 → 변경 전 주소로 발송\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{NEW_EMAIL_MASKED}}, {{CHANGED_AT}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 로그인 이메일이 변경되었습니다</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">이 계정의 로그인 이메일이 {{NEW_EMAIL_MASKED}}(으)로 바뀌었습니다. 본인이 아니라면 바로 알려 주세요.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">회원 계정</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#EEF2F8;color:#3F4C6B;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">이메일 변경</span></div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">로그인 이메일이 변경되었습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">이 계정의 로그인 이메일이 새 주소로 바뀌었습니다. 이 주소로는 더 이상 로그인할 수 없고 알림도 가지 않습니다.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">새 이메일</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{NEW_EMAIL_MASKED}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">변경 일시</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{CHANGED_AT}}</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (red) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FBEAEA\" style=\"background-color:#FBEAEA;border-radius:8px;\"><tr><td bgcolor=\"#FBEAEA\" style=\"padding:14px 18px;border-left:3px solid #D08A8A;background-color:#FBEAEA;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#7A1F1F;\">본인이 바꾸지 않았다면</div><div style=\"font-size:13px;line-height:1.6;color:#8F3535;padding-top:4px;\">{{SUPPORT_EMAIL}}로 바로 알려 주세요. 확인 후 계정을 원래대로 되돌려 드립니다.</div></td></tr></table></td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">본인이 요청하지 않았다면 이 메일에 회신해 즉시 알려 주세요. 이 메일은 변경 전 주소로만 발송됩니다.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 변경 전 로그인 이메일 주소로 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ACC_PHONE_CHANGED": "<!DOCTYPE html>\n<!--\nMICEGO email template: ACC_PHONE_CHANGED (휴대전화 변경 완료)\nSubject: [MICEGO] 휴대전화 번호가 변경되었습니다\nPreheader: 계정의 휴대전화가 {{NEW_PHONE_MASKED}}(으)로 바뀌었습니다. 본인이 아니라면 바로 알려 주세요.\nTrigger: 계정 휴대전화 변경 완료 (새 번호 인증 후)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{NEW_PHONE_MASKED}}, {{SUPPORT_EMAIL}}, {{CHANGED_AT}}, {{RESET_URL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 휴대전화 번호가 변경되었습니다</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">계정의 휴대전화가 {{NEW_PHONE_MASKED}}(으)로 바뀌었습니다. 본인이 아니라면 바로 알려 주세요.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">회원 계정</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#EEF2F8;color:#3F4C6B;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">휴대전화 변경</span></div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">휴대전화 번호가 변경되었습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">계정에 등록된 휴대전화가 바뀌었습니다. 앞으로 진행 알림과 제안 선택 인증번호는 새 번호로 갑니다.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">새 휴대전화</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{NEW_PHONE_MASKED}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">변경 일시</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{CHANGED_AT}}</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (amber) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FFF3D6\" style=\"background-color:#FFF3D6;border-radius:8px;\"><tr><td bgcolor=\"#FFF3D6\" style=\"padding:14px 18px;border-left:3px solid #FFC24B;background-color:#FFF3D6;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">진행 중인 요청에도 적용됩니다</div><div style=\"font-size:13px;line-height:1.6;color:#7A4E00;padding-top:4px;\">제안을 선택할 때 받는 인증번호도 새 번호로 갑니다.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{RESET_URL}}\" style=\"height:52px;v-text-anchor:middle;width:300px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">비밀번호 재설정하기</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{RESET_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">비밀번호 재설정하기</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">본인이 바꾸지 않았다면 이 링크로 비밀번호를 다시 정해 주세요. 30분 안에 한 번만 쓸 수 있습니다.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">본인이 요청하지 않았다면 바로 {{SUPPORT_EMAIL}}로 알려 주세요. 로그인 비밀번호도 함께 바꾸시길 권합니다.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO 회원 계정과 관련해 해당 이메일 주소로 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ACC_LOCKED": "<!DOCTYPE html>\n<!--\nMICEGO email template: ACC_LOCKED (계정 잠금 안내)\nSubject: [MICEGO] 로그인 실패가 반복되어 계정을 잠갔습니다\nPreheader: {{LOCKED_AT}}에 로그인 실패가 10회 이어져 계정을 보호하려고 잠갔습니다. 비밀번호를 재설정하면 풀립니다.\nTrigger: 1시간 안에 로그인 10회 실패 → 잠금\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{LOCKED_AT}}, {{SUPPORT_EMAIL}}, {{RESET_URL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 로그인 실패가 반복되어 계정을 잠갔습니다</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">{{LOCKED_AT}}에 로그인 실패가 10회 이어져 계정을 보호하려고 잠갔습니다. 비밀번호를 재설정하면 풀립니다.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">회원 계정</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#FBE9E9;color:#9B2C2C;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">계정 잠금</span></div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">로그인 실패가 반복되어 계정을 잠갔습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">1시간 안에 로그인에 10회 실패해 계정을 보호하려고 로그인을 막았습니다.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">잠금 일시</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{LOCKED_AT}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">해제 방법</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">비밀번호 재설정</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (amber) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FFF3D6\" style=\"background-color:#FFF3D6;border-radius:8px;\"><tr><td bgcolor=\"#FFF3D6\" style=\"padding:14px 18px;border-left:3px solid #FFC24B;background-color:#FFF3D6;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">재설정하면 바로 풀립니다</div><div style=\"font-size:13px;line-height:1.6;color:#7A4E00;padding-top:4px;\">아래 버튼으로 새 비밀번호를 정하면 잠금이 풀리고 모든 기기에서 로그아웃됩니다. 링크는 30분 동안 한 번만 쓸 수 있습니다.</div></td></tr></table></td></tr></table>\n<!-- G. CTA -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:28px 32px 8px;background-color:#FFFFFF;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#0B8F86\" style=\"border-radius:8px;background-color:#0B8F86;\"><!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"{{RESET_URL}}\" style=\"height:52px;v-text-anchor:middle;width:300px;\" arcsize=\"15%\" stroke=\"f\" fillcolor=\"#0B8F86\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;\">비밀번호 재설정하기</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href=\"{{RESET_URL}}\" target=\"_blank\" style=\"display:inline-block;padding:16px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#0B8F86;\">비밀번호 재설정하기</a><!--<![endif]--></td></tr></table></td></tr></table>\n<!-- H. Link note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" align=\"center\" bgcolor=\"#FFFFFF\" style=\"padding:6px 32px 8px;background-color:#FFFFFF;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.7;color:#5B6788;\">개인 링크입니다. 외부에 전달하지 말아 주세요.</td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">본인이 요청하지 않았다면(본인의 로그인 시도가 아니라면) 위 링크를 누르지 않으셔도 됩니다. 다른 사이트에서 같은 비밀번호를 쓰고 있다면 그쪽도 바꾸시길 권합니다. 문의는 {{SUPPORT_EMAIL}}로 보내 주세요.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO 회원 계정과 관련해 해당 이메일 주소로 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "ACC_WITHDRAWN": "<!DOCTYPE html>\n<!--\nMICEGO email template: ACC_WITHDRAWN (탈퇴 완료 안내)\nSubject: [MICEGO] 회원 탈퇴를 마쳤습니다\nPreheader: 계정과 연락처를 파기하고 공유 링크를 모두 중지했습니다. 성사 기록은 3년간 보관합니다.\nTrigger: 회원 탈퇴 완료 (본인 요청 · 운영자 처리 포함)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{SUPPORT_EMAIL}}, {{WITHDRAWN_AT}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 회원 탈퇴를 마쳤습니다</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">계정과 연락처를 파기하고 공유 링크를 모두 중지했습니다. 성사 기록은 3년간 보관합니다.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">회원 계정</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#EEF2F8;color:#3F4C6B;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">탈퇴 완료</span></div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">회원 탈퇴를 마쳤습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">그동안 MICEGO를 이용해 주셔서 감사합니다. 계정과 연락처는 즉시 파기했고, 추적 링크와 공유 링크는 모두 사용을 중지했습니다.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">탈퇴 일시</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{WITHDRAWN_AT}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">파기한 정보</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">이메일 · 휴대전화 · 로그인 정보</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">보관하는 기록</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">성사 요청의 연결 기록 (3년)</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (gray) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#EEF2F8\" style=\"background-color:#EEF2F8;border-radius:8px;\"><tr><td bgcolor=\"#EEF2F8\" style=\"padding:14px 18px;border-left:3px solid #8B97B5;background-color:#EEF2F8;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">이미 호텔에 전달된 정보</div><div style=\"font-size:13px;line-height:1.6;color:#3F4C6B;padding-top:4px;\">선정 호텔에 이미 전달된 회사명과 담당자 정보는 회수되지 않습니다. 성사된 요청의 연결 기록은 분쟁 대응을 위해 3년간 보관한 뒤 파기합니다.</div></td></tr></table></td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">본인이 요청하지 않았다면 바로 {{SUPPORT_EMAIL}}로 알려 주세요. 같은 이메일로 다시 가입할 수 있지만 이전 요청은 연결되지 않습니다.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 탈퇴한 계정의 이메일 주소로 마지막으로 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "FB_OPS_ALERT": "<!DOCTYPE html>\n<!--\nMICEGO email template: FB_OPS_ALERT (피드백 운영 알림)\nSubject: [MICEGO 피드백] {{FB_REF}} · {{FB_CATEGORY}} · {{FB_USER_TYPE}}\nPreheader: {{FB_PAGE}} · 이 메일에 답장하면 접수자에게 바로 전달됩니다.\nTrigger: feedback-submit 접수 성공 (DEMO·의심·일일 상한 초과는 제외) → FEEDBACK_INBOX\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{FB_REF}}, {{FB_CATEGORY}}, {{FB_USER_TYPE}}, {{FB_PAGE}}, {{FB_RECEIVED_AT}}, {{FB_REPLY_EMAIL}}, {{FB_UA}}, {{FB_CONTENT}}, {{FB_CONSOLE_URL}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO 피드백] {{FB_REF}} · {{FB_CATEGORY}} · {{FB_USER_TYPE}}</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">{{FB_PAGE}} · 이 메일에 답장하면 접수자에게 바로 전달됩니다.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">피드백</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#FFF3D6;color:#8A5A00;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">신규 접수</span>&nbsp;&nbsp;REF {{FB_REF}}</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">새 의견이 접수되었습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">접수번호 {{FB_REF}}. 답장할 때 제목의 접수번호를 지우지 마세요. 메일함 검색과 스레드의 기준입니다.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">접수번호</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{FB_REF}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">접수 시각</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{FB_RECEIVED_AT}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">유형</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{FB_CATEGORY}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">보낸 사람</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{FB_USER_TYPE}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">회신 주소</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{FB_REPLY_EMAIL}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">페이지</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{FB_PAGE}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">브라우저</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{FB_UA}}</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (gray) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#EEF2F8\" style=\"background-color:#EEF2F8;border-radius:8px;\"><tr><td bgcolor=\"#EEF2F8\" style=\"padding:14px 18px;border-left:3px solid #8B97B5;background-color:#EEF2F8;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">내용</div><div style=\"font-size:13px;line-height:1.6;color:#3F4C6B;padding-top:4px;\">{{FB_CONTENT}}</div></td></tr></table></td></tr></table>\n<!-- F. Callout (amber) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#FFF3D6\" style=\"background-color:#FFF3D6;border-radius:8px;\"><tr><td bgcolor=\"#FFF3D6\" style=\"padding:14px 18px;border-left:3px solid #FFC24B;background-color:#FFF3D6;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">콘솔에서 열기</div><div style=\"font-size:13px;line-height:1.6;color:#7A4E00;padding-top:4px;\">{{FB_CONSOLE_URL}}</div></td></tr></table></td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">토큰 원문·IP·회원 ID는 이 메일에 담지 않습니다. 접속 링크가 본문에 있으면 [token]으로 가려집니다.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO 사이트의 '의견 보내기' 또는 문의 페이지로 접수된 내용을 운영팀에 전달합니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n", "FB_ACK": "<!DOCTYPE html>\n<!--\nMICEGO email template: FB_ACK (피드백 접수 확인)\nSubject: [MICEGO] 보내 주신 의견을 접수했습니다 ({{FB_REF}})\nPreheader: 접수번호 {{FB_REF}} · 답변이 필요한 내용이면 이 주소로 회신드립니다.\nTrigger: 회신 이메일 + 수집 동의가 있는 접수 (DEMO·의심 제외, 같은 주소 하루 3건까지)\nFrom: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}\nVariables: {{FB_REF}}, {{FB_CATEGORY}}, {{FB_RECEIVED_AT}}, {{SUPPORT_EMAIL}}, {{FROM_ADDRESS}}\nAll values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.\n-->\n<html lang=\"ko\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<meta name=\"color-scheme\" content=\"light\">\n<meta name=\"supported-color-schemes\" content=\"light\">\n<title>[MICEGO] 보내 주신 의견을 접수했습니다 ({{FB_REF}})</title>\n<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>\n<body bgcolor=\"#F6F8FB\" style=\"margin:0;padding:0;background-color:#F6F8FB;\">\n<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F6F8FB;\">접수번호 {{FB_REF}} · 답변이 필요한 내용이면 이 주소로 회신드립니다.&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;\"><tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"padding:32px 16px;background-color:#F6F8FB;\">\n<table role=\"presentation\" class=\"email-container\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:600px;\"><tr><td bgcolor=\"#FFFFFF\" style=\"background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:12px;overflow:hidden;\">\n<!-- A. Header bar -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#0F1E3D\"><tr><td class=\"px-mobile\" bgcolor=\"#0F1E3D\" style=\"padding:18px 32px;background-color:#0F1E3D;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"left\" bgcolor=\"#0F1E3D\" style=\"font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:#0F1E3D;\">MICE<span style=\"color:#5FD6CC;\">GO</span></td><td align=\"right\" bgcolor=\"#0F1E3D\" style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFC24B;letter-spacing:.08em;background-color:#0F1E3D;\">피드백</td></tr></table></td></tr></table>\n<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:32px 32px 0;background-color:#FFFFFF;\">\n<div style=\"font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#0B8F86;letter-spacing:.08em;\"><span style=\"display:inline-block;background-color:#E3F5F2;color:#076B64;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;\">접수 확인</span>&nbsp;&nbsp;REF {{FB_REF}}</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:24px;line-height:1.35;font-weight:700;color:#0F1E3D;padding-top:14px;\">보내 주신 의견을 접수했습니다.</div>\n<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;\">MICEGO에 의견을 보내 주셔서 감사합니다. 답변이 필요한 내용이면 담당자가 이 주소로 회신드립니다.</div>\n</td></tr></table>\n<!-- E. Summary table -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">접수번호</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{FB_REF}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">접수 유형</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;border-bottom:1px solid #E4E8F0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{FB_CATEGORY}}</td></tr>\n<tr><td class=\"lbl\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 12px 10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:13px;line-height:1.5;color:#5B6788;width:36%;background-color:#FFFFFF;\">접수 시각</td><td class=\"val\" valign=\"top\" bgcolor=\"#FFFFFF\" style=\"padding:10px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;background-color:#FFFFFF;\">{{FB_RECEIVED_AT}}</td></tr>\n</table></td></tr></table>\n<!-- F. Callout (gray) -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 0;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#EEF2F8\" style=\"background-color:#EEF2F8;border-radius:8px;\"><tr><td bgcolor=\"#EEF2F8\" style=\"padding:14px 18px;border-left:3px solid #8B97B5;background-color:#EEF2F8;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;\"><div style=\"font-size:14px;line-height:1.5;font-weight:700;color:#0F1E3D;\">덧붙일 내용이 있다면</div><div style=\"font-size:13px;line-height:1.6;color:#3F4C6B;padding-top:4px;\">이 메일에 그대로 답장해 주세요. 제목의 접수번호는 지우지 말아 주세요.</div></td></tr></table></td></tr></table>\n<!-- I. Policy note -->\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td class=\"px-mobile\" bgcolor=\"#FFFFFF\" style=\"padding:24px 32px 32px;background-color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"#FFFFFF\" style=\"border-top:1px solid #E4E8F0;padding-top:20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;\">직접 보내신 적이 없다면 이 메일은 무시하셔도 됩니다. 보안을 위해 보내 주신 본문은 이 확인 메일에 담지 않습니다.</td></tr></table></td></tr></table>\n</td></tr>\n<!-- J. Footer -->\n<tr><td align=\"center\" bgcolor=\"#F6F8FB\" style=\"background-color:#F6F8FB;padding:24px 32px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;font-size:12px;line-height:1.8;color:#5B6788;\">이 메일은 MICEGO 사이트에서 의견을 보내며 회신 이메일을 남기고 동의하신 분께 발송됩니다.<br>MICEGO &middot; 문의 <a href=\"mailto:{{SUPPORT_EMAIL}}\" style=\"color:#5B6788;\">{{SUPPORT_EMAIL}}</a></td></tr>\n</table></td></tr></table>\n</body>\n</html>\n"};

